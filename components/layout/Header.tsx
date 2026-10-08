import { Button } from "@/components/ui/Button";

export function Header({ onMenuClick, title }) {
  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b border-border bg-surface sticky top-0 z-30">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={onMenuClick} className="md:hidden">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
        <h1 className="text-lg font-bold font-heading">{title}</h1>
      </div>
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-white font-bold">AW</div>
      </div>
    </header>
  );
}