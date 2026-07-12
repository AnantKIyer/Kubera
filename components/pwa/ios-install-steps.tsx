import type { ReactNode } from "react";
import { Share } from "lucide-react";

export function IosInstallSteps() {
  return (
    <ol className="space-y-3 text-sm text-muted-foreground">
      <InstallStep
        step={1}
        title="Open in Safari"
        description="Use Safari — in-app browsers from other apps won't work."
      />
      <InstallStep
        step={2}
        title="Tap Share"
        description="The square icon with an arrow pointing up, at the bottom of Safari."
        icon={<Share size={14} className="inline text-foreground" />}
      />
      <InstallStep
        step={3}
        title="Add to Home Screen"
        description='Scroll the share sheet and tap "Add to Home Screen", then tap Add.'
      />
    </ol>
  );
}

function InstallStep({
  step,
  title,
  description,
  icon,
}: {
  step: number;
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
        {step}
      </span>
      <div>
        <p className="font-medium text-foreground">
          {title}
          {icon ? <> {icon}</> : null}
        </p>
        <p className="mt-0.5 leading-relaxed">{description}</p>
      </div>
    </li>
  );
}
