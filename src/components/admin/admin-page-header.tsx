type AdminPageHeaderProps = {
  title: string;
  description: string;
  badge?: string;
};

export function AdminPageHeader({ title, description, badge }: AdminPageHeaderProps) {
  return (
    <div className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
      {badge ? (
        <span className="inline-flex rounded-full bg-[#EAF9F8] px-3 py-1 text-xs font-semibold tracking-[0.1em] text-[#1E8C8A] uppercase">
          {badge}
        </span>
      ) : null}
      <h1 className="mt-3 font-display text-3xl text-[#1F2937]">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
