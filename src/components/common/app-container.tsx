import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppContainerProps = {
  children: ReactNode;
  className?: string;
};

export function AppContainer({ children, className }: AppContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-5 md:px-8", className)}>
      {children}
    </div>
  );
}