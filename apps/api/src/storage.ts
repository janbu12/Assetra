import { BadRequestException, Controller, Injectable, Param, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { PrismaService } from './prisma.service';
import { Permissions } from './auth';

@Injectable()
export class StorageService {
  private client = new S3Client({ region: process.env.S3_REGION || 'us-east-1', endpoint: process.env.S3_ENDPOINT, forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY || 'assetra', secretAccessKey: process.env.S3_SECRET_KEY || 'assetra-secret' } });
  constructor(private db: PrismaService) {}
  async assetPhoto(assetId: string, file?: Express.Multer.File) {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) throw new BadRequestException('Foto harus berupa JPG, PNG, atau WebP');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Ukuran foto maksimal 10 MB');
    const body = await sharp(file.buffer).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const objectKey = `assets/${assetId}/${crypto.randomUUID()}.webp`;
    await this.client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET || 'assetra', Key: objectKey, Body: body, ContentType: 'image/webp' }));
    return this.db.assetPhoto.create({ data: { assetId, objectKey } });
  }
}

@ApiTags('storage')
@Controller('assets')
export class StorageController {
  constructor(private service: StorageService) {}
  @Permissions('assets.write') @Post(':id/photos') @ApiConsumes('multipart/form-data') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() _req: any) { return this.service.assetPhoto(id, file); }
}
