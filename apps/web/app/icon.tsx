import { ImageResponse } from 'next/og';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';
export default function Icon(){return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#12352f',borderRadius:112}}><div style={{fontSize:280,fontWeight:900,color:'#dff36b',fontFamily:'sans-serif',letterSpacing:-24}}>A</div></div>,size)}
