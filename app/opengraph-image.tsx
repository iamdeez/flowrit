import { ImageResponse } from 'next/og'

export const alt = 'Flowrit — 고객 의뢰·수정 요청·납품 링크를 한 곳에서 관리하세요'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3730a3 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        {/* Logo text */}
        <div
          style={{
            color: 'white',
            fontSize: 80,
            fontWeight: 800,
            letterSpacing: '-3px',
            lineHeight: 1,
          }}
        >
          Flowrit
        </div>

        {/* Tagline */}
        <div
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 28,
            fontWeight: 400,
            marginTop: 24,
            textAlign: 'center',
            maxWidth: 740,
            lineHeight: 1.5,
          }}
        >
          고객 의뢰·수정 요청·납품 링크를 한 곳에서 관리하세요
        </div>

        {/* Divider */}
        <div
          style={{
            width: 48,
            height: 3,
            background: 'rgba(255,255,255,0.4)',
            borderRadius: 2,
            marginTop: 36,
          }}
        />

        {/* URL */}
        <div
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 20,
            marginTop: 24,
            letterSpacing: '0.5px',
          }}
        >
          flowrit.motionbit.kr
        </div>
      </div>
    ),
    { ...size },
  )
}
