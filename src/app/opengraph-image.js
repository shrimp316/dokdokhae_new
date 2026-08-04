import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = '너 참 독독하다 - 우리 독서모임';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const [serifBold, sansMedium] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/NotoSerifKR-700.woff')),
    readFile(join(process.cwd(), 'assets/fonts/NotoSansKR-500.woff')),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7ede8',
        }}
      >
        <div
          style={{
            width: 64,
            height: 6,
            borderRadius: 3,
            background: '#c0492b',
            marginBottom: 44,
            display: 'flex',
          }}
        />
        <div
          style={{
            fontFamily: 'Noto Serif KR',
            fontWeight: 700,
            fontSize: 96,
            color: '#191919',
            display: 'flex',
          }}
        >
          너 참 독독하다
        </div>
        <div
          style={{
            fontFamily: 'Noto Sans KR',
            fontWeight: 500,
            fontSize: 36,
            color: '#6b7280',
            marginTop: 28,
            display: 'flex',
          }}
        >
          우리 독서모임
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Noto Serif KR', data: serifBold, style: 'normal', weight: 700 },
        { name: 'Noto Sans KR', data: sansMedium, style: 'normal', weight: 500 },
      ],
    }
  );
}
