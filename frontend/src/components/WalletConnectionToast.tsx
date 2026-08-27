import React, { useEffect } from "react";

interface WalletToastProps {
  connected: boolean;
  walletAddress?: string;
  onDismiss: () => void;
}

const WalletConnectionToast: React.FC<WalletToastProps> = ({
  connected,
  walletAddress,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const message = connected
    ? `Wallet connected: ${walletAddress ? walletAddress.slice(0, 8) + "..." : "unknown"}`
    : "Wallet disconnected";

  const bgColor = connected ? "bg-green-600" : "bg-red-600";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-white shadow-lg ${bgColor}`}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-2 text-white hover:opacity-75"
      >
        x
      </button>
    </div>
  );
};

export default WalletConnectionToast;