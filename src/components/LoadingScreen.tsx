// Branded loading screen: shown while auth checks or data loads
export default function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand font-sans">
      <div className="flex flex-col items-center gap-4">
        <img src="/nangomalogo.webp" alt="Nangoma Safari Lodge" className="h-32 w-auto rounded-xl" />
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-ochre border-t-transparent" />
      </div>
    </div>
  );
}
