import { toast } from "sonner";

export function toastSuccess(message: string, description?: string) {
  toast.success(message, description ? { description } : undefined);
}

export function toastError(message: string, description?: string) {
  toast.error(message, description ? { description } : undefined);
}

export function toastInfo(message: string, description?: string) {
  toast.message(message, description ? { description } : undefined);
}

export function toastFromError(err: unknown, fallback = "Something went wrong") {
  const message = err instanceof Error ? err.message : fallback;
  toast.error(message);
  return message;
}
