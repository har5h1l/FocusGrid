import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

export default function GoogleAuthSuccess() {
  useEffect(() => {
    // Notify the opener (parent window) that authentication was successful
    if (window.opener) {
      window.opener.postMessage('google-auth-success', window.location.origin);
      // Close this popup window after a short delay
      setTimeout(() => {
        window.close();
      }, 2000);
    }
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center flex-col space-y-4 p-6 text-center">
      <CheckCircle className="h-16 w-16 text-green-500" />
      <h1 className="text-2xl font-bold">Authentication Successful</h1>
      <p className="text-gray-500">
        You've successfully connected to Google Calendar. This window will close automatically.
      </p>
    </div>
  );
} 