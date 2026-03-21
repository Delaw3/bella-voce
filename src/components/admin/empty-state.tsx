export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#9FD6D5] bg-white px-4 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
