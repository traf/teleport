import Logo from "./Logo";
import Badge from "./Badge";

// The brand mark: the glassy logo in its rounded-square badge, linking home.
export default function Mark({ className = "" }: { className?: string }) {
  return (
    <Badge href="/" label="Teleport home" className={className}>
      <Logo className="size-5" />
    </Badge>
  );
}
