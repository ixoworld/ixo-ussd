/* eslint-disable no-console */
/**
 * Message formatting utilities for USSD responses
 */

export interface MessageOptions {
  showBack?: boolean;
  showExit?: boolean;
  customBackText?: string;
  customExitText?: string;
}

/**
 * Format USSD message with consistent navigation options
 */
export function formatUSSDMessage(
  content: string,
  options: MessageOptions = {}
): string {
  const {
    showBack = true,
    showExit = false,
    customBackText = "0. Back",
    customExitText = "*. Exit",
  } = options;

  let message = content.trim();

  // Add navigation options
  const navigationOptions: string[] = [];

  if (showBack) {
    navigationOptions.push(customBackText);
  }

  if (showExit) {
    navigationOptions.push(customExitText);
  }

  if (navigationOptions.length > 0) {
    message += "\n" + navigationOptions.join("\n");
  }

  return message;
}
