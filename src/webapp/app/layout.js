import './globals.css';

export const metadata = {
  title: 'CineKube Visuals',
  description: 'Weekly Releases Posters',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
