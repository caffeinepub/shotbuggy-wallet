import { ExternalLink, Heart } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();
  const caffeineUrl = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`;

  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: copyright */}
          <p className="text-xs text-muted-foreground">
            ShotBuggy Wallet &copy; {year}
          </p>

          {/* Center: links */}
          <div className="flex items-center gap-4">
            {["Privacy", "Terms", "Support"].map((link) => (
              <span
                key={link}
                className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                {link}
              </span>
            ))}
          </div>

          {/* Right: caffeine.ai + ICP attribution */}
          <div className="flex items-center gap-4">
            <a
              href="https://internetcomputer.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Powered by Internet Computer
            </a>
            <a
              href={caffeineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Built with{" "}
              <Heart
                className="w-3 h-3 text-destructive mx-0.5"
                fill="currentColor"
              />{" "}
              caffeine.ai
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
