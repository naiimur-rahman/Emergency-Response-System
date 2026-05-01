import './globals.css';
import ClientWrapper from './ClientWrapper';

export const metadata = {
  title: 'Emergency Response System — Emergency Dispatch Control',
  description: 'Real-time ambulance dispatch management system for Dhaka, Bangladesh.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
