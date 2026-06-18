export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 w-full">
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce"></div>
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">กำลังโหลดข้อมูล...</p>
    </div>
  );
}
