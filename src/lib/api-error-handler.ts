import mongoose from "mongoose";
import { NextResponse } from "next/server";

type ApiErrorOptions = {
  duplicateMessage?: string;
  duplicateFieldErrors?: Record<string, string>;
  validationMessage?: string;
  fallbackMessage?: string;
};

export function handleApiError(error: unknown, options: ApiErrorOptions = {}) {
  const {
    duplicateMessage = "Duplicate record detected.",
    duplicateFieldErrors,
    validationMessage = "Invalid request data.",
    fallbackMessage = "Unable to process your request right now.",
  } = options;

  if (error instanceof mongoose.Error.ValidationError) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  ) {
    return NextResponse.json(
      {
        message: duplicateMessage,
        fieldErrors: duplicateFieldErrors,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}
