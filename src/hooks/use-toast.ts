import * as React from "react";
import { toast as sonnerToast } from "sonner";

import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type Toast = Omit<ToasterToast, "id">;

function toast(props: Toast) {
  const message = String(props.title ?? props.description ?? "Notification");
  const description = props.title && props.description ? String(props.description) : undefined;

  if (props.variant === "destructive") {
    sonnerToast.error(message, { description });
  } else {
    sonnerToast.success(message, { description });
  }

  return { id: "", dismiss: () => {}, update: () => {} };
}

function useToast() {
  return {
    toasts: [] as ToasterToast[],
    toast,
    dismiss: () => {},
  };
}

export { useToast, toast };
