/* eslint-disable no-console */
/**
 * USSD Response Service
 *
 * Handles conversion of state machine snapshots to USSD responses.
 */

import { formatUSSDMessage } from "../utils/message-formatter.js";

export interface USSDResponse {
  message: string;
  isEnd: boolean;
}

export class USSDResponseService {
  /**
   * Generate USSD response from machine snapshot
   */
  generateResponse(snapshot: any): USSDResponse {
    // Get message from context (child has priority)
    let message = this.getMessageFromSnapshot(snapshot);

    // Determine effective active state (child state if present, else parent)
    const effectiveState = this.getActiveStateValue(snapshot);

    // Auto-format message with back option (unless it's a final state)
    if (
      !this.shouldEndSession(snapshot) &&
      !this.isVerifyingState(effectiveState)
    ) {
      message = this.autoFormatMessage(message, effectiveState);
    }

    // Determine if this should be an END response
    const isEnd = this.shouldEndSession(snapshot);

    // Ensure message fits USSD limits
    const truncatedMessage = this.truncateMessage(message);

    return {
      message: truncatedMessage,
      isEnd,
    };
  }

  /**
   * Get message from snapshot, prioritizing the deepest active child machine.
   * Recursively traverses the children tree to handle 3+ levels of nesting.
   */
  private getMessageFromSnapshot(snapshot: any): string {
    const deepestMessage = this.findDeepestChildMessage(snapshot);
    if (deepestMessage) {
      return deepestMessage;
    }

    // Fallback to parent machine message
    const parentMessage = snapshot.context?.message || "Service unavailable";
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `📨 Using message from parent machine: ${parentMessage.substring(0, 10)}...`
      );
    }
    return parentMessage;
  }

  /**
   * Recursively find the deepest child machine's message.
   * Traverses nested children to support deeply nested state machines (3+ levels).
   */
  private findDeepestChildMessage(snapshot: any): string | null {
    if (!snapshot.children || Object.keys(snapshot.children).length === 0) {
      return null;
    }

    for (const [childId, childActor] of Object.entries(snapshot.children)) {
      if (
        childActor &&
        typeof childActor === "object" &&
        "getSnapshot" in childActor
      ) {
        try {
          const childSnapshot = (childActor as any).getSnapshot();

          // Recurse into nested children first (deepest wins)
          const nestedMessage = this.findDeepestChildMessage(childSnapshot);
          if (nestedMessage) {
            return nestedMessage;
          }

          // If no deeper child has a message, use this child's message
          if (childSnapshot?.context?.message) {
            if (process.env.NODE_ENV !== "production") {
              console.log(`📨 Using message from child machine: ${childId}`);
            }
            return childSnapshot.context.message;
          }
        } catch (error) {
          console.warn(
            `⚠️ Could not get snapshot from child ${childId}:`,
            error
          );
        }
      }
    }

    return null;
  }

  /**
   * Determine if session should end based on machine state
   */
  private shouldEndSession(snapshot: any): boolean {
    // End session if machine is in final state
    if (snapshot.status === "done") {
      return false;
    }

    // End session if in closeSession state
    if (snapshot.value === "closeSession") {
      return false;
    }

    // End session if there's a critical error
    if (snapshot.context?.error && snapshot.value === "error") {
      return true;
    }

    // Continue session by default
    return false;
  }

  /**
   * Truncate message to fit USSD character limits
   */
  private truncateMessage(message: string): string {
    const MAX_LENGTH = 182;

    if (message.length <= MAX_LENGTH) {
      return message;
    }

    // Truncate and add ellipsis
    return message.substring(0, MAX_LENGTH - 3) + "...";
  }

  /**
   * Format USSD response for testing/development
   */
  format(response: USSDResponse): string {
    const status = response.isEnd ? "END" : "CON";
    return `${status} ${response.message}`;
  }

  /**
   * Auto-format message with navigation options based on state
   */
  private autoFormatMessage(message: string, state: string): string {
    // Don't add back option if message already has navigation
    if (message.includes("0. Back") || message.includes("*. Exit")) {
      return message;
    }
    if (process.env.NODE_ENV !== "production") {
      console.log("State:", state);
    }
    // States that shouldn't have back option
    const noBackStates = [
      "idle",
      "closeSession",
      "verifyingWallet",
      "verifyingAgent",
      "creatingAccount",
      "accountCreationSuccess",
    ];
    if (noBackStates.includes(state)) {
      return message;
    }

    // Add appropriate navigation based on state
    if (state === "preMenu") {
      return formatUSSDMessage(message, { showBack: false, showExit: true });
    }

    return formatUSSDMessage(message);
  }

  /**
   * Check if current state is a verifying/processing state
   */
  private isVerifyingState(stateValue: any): boolean {
    const verifyingStates = ["verifyingWallet", "verifyingAgent", "processing"];
    return verifyingStates.includes(stateValue);
  }

  /**
   * Get the active state value, considering the deepest child machine first.
   * Recursively traverses nested children to support 3+ levels.
   */
  private getActiveStateValue(snapshot: any): string {
    const deepestValue = this.findDeepestChildStateValue(snapshot);
    return deepestValue ?? (snapshot.value as string);
  }

  /**
   * Recursively find the deepest child machine's state value.
   */
  private findDeepestChildStateValue(snapshot: any): string | null {
    if (!snapshot.children || Object.keys(snapshot.children).length === 0) {
      return null;
    }

    for (const [, childActor] of Object.entries(snapshot.children)) {
      if (
        childActor &&
        typeof childActor === "object" &&
        "getSnapshot" in childActor
      ) {
        try {
          const childSnapshot = (childActor as any).getSnapshot();

          // Recurse into nested children first (deepest wins)
          const nestedValue = this.findDeepestChildStateValue(childSnapshot);
          if (nestedValue) {
            return nestedValue;
          }

          if (childSnapshot?.value) {
            return childSnapshot.value as string;
          }
        } catch {}
      }
    }

    return null;
  }
}

// Export singleton instance
export const ussdResponseService = new USSDResponseService();
