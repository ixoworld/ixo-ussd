/* eslint-disable no-console */
/**
 * Session Service
 *
 * A session service that works with the modular state machines.
 * Automatically configures actors based on the current environment
 * (production, development, or test).
 */

import { createActor, type Actor } from "xstate";
import { exampleMachine } from "../machines/example/parentMachine.js";
import { createModuleLogger } from "./logger.js";
import { dataService } from "./database-storage.js";
import { ussdInputService } from "./ussd-input.js";
import { ussdResponseService } from "./ussd-response.js";

// In-memory session storage for testing
const sessions = new Map<string, Actor<any>>();

// Get actors for current environment (development/test/production)
const actors = {};

// Logger for session service
const logger = createModuleLogger("session");

export interface SessionInput {
  phoneNumber: string;
  serviceCode: string;
  text: string;
  sessionId: string;
}

export interface SessionResponse {
  message: string;
  isEnd: boolean;
  formattedResponse: string;
}

export class SessionService {
  /**
   * Create or update phone record when user dials USSD service
   */
  private async handlePhoneRecord(phoneNumber: string): Promise<void> {
    try {
      logger.debug(
        { phoneNumber: phoneNumber.slice(-4) },
        "Creating/updating phone record for USSD dial"
      );

      const phoneRecord =
        await dataService.createOrUpdatePhoneRecord(phoneNumber);

      logger.info(
        {
          phoneId: phoneRecord.id,
          phoneNumber: phoneNumber.slice(-4),
          visits: phoneRecord.numberOfVisits,
          isNew: phoneRecord.numberOfVisits === 1,
        },
        phoneRecord.numberOfVisits === 1
          ? "Created new phone record for first-time USSD user"
          : "Updated existing phone record for returning USSD user"
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          phoneNumber: phoneNumber.slice(-4),
        },
        "Failed to create/update phone record for USSD dial"
      );
      // Don't throw - USSD should continue even if phone record fails
    }
  }

  async processSession(input: SessionInput): Promise<SessionResponse> {
    const { phoneNumber, serviceCode, text, sessionId } = input;

    try {
      let actor = sessions.get(sessionId);

      if (!actor) {
        // Create new session
        console.log(`🆕 Creating new session: ${sessionId}`);

        // Step 1: Create or update phone record (progressive data)
        await this.handlePhoneRecord(phoneNumber);

        // Configure machine with environment-appropriate actors
        const configuredMachine = exampleMachine.provide({
          actors,
        });

        actor = createActor(configuredMachine, {
          input: {
            sessionId,
            phoneNumber,
            serviceCode,
          },
        });
        actor.start();
        sessions.set(sessionId, actor);

        // Send initial dial event
        const dialEvent = {
          type: "DIAL_USSD" as const,
          phoneNumber,
          serviceCode,
        };
        actor.send(dialEvent);

        console.log(`📞 Sent DIAL_USSD event for ${phoneNumber}`);
      } else {
        // Process user input
        if (text) {
          console.log(`📝 Processing input: "${text}"`);
          this.processUserInput(actor, text);
        }
      }

      const snapshot = actor.getSnapshot();
      console.log(`🎯 Current state: ${snapshot.value}`);
      console.log(
        `💬 Context message: ${snapshot.context?.message.substring(0, 10)}`
      );
      console.log(
        `Snapshot Children: ${Object.keys(snapshot.children).length}`
      );

      const response = this.generateResponse(snapshot);

      // Clean up if session ended
      if (response.isEnd) {
        this.cleanupSession(sessionId);
      }

      return response;
    } catch (error) {
      console.error("❌ Session processing error:", error);
      return {
        message: "Service temporarily unavailable. Please try again later.",
        isEnd: true,
        formattedResponse:
          "END Service temporarily unavailable. Please try again later.",
      };
    }
  }

  private processUserInput(actor: Actor<any>, text: string): void {
    // Use the USSD input service to parse input
    const parsedEvent = ussdInputService.parseInput(text);

    // Convert to the format expected by the machines
    const event = {
      type: parsedEvent.type,
      ...(parsedEvent.value && { input: parsedEvent.value }),
    };
    console.log(`🎮 Sending Event:`, event);

    actor.send(event);
  }

  private generateResponse(snapshot: any): SessionResponse {
    // Use the USSD response service to generate response
    const ussdResponse = ussdResponseService.generateResponse(snapshot);

    return {
      message: ussdResponse.message,
      isEnd: ussdResponse.isEnd,
      formattedResponse: ussdResponseService.format(ussdResponse),
    };
  }

  async cleanupSession(sessionId: string): Promise<void> {
    const actor = sessions.get(sessionId);
    if (actor) {
      actor.stop();
      sessions.delete(sessionId);
      console.log(`🧹 Session cleaned up: ${sessionId}`);
    }
  }

  // Get session for testing/debugging
  getSession(sessionId: string): Actor<any> | undefined {
    return sessions.get(sessionId);
  }

  // Get all active sessions (for monitoring)
  getActiveSessions(): string[] {
    return Array.from(sessions.keys());
  }

  // Debug method to inspect session state
  debugSession(sessionId: string): any {
    const actor = sessions.get(sessionId);
    if (!actor) {
      return { error: "Session not found" };
    }

    const snapshot = actor.getSnapshot();
    return {
      sessionId,
      state: snapshot.value,
      context: snapshot.context,
      status: snapshot.status,
    };
  }
}

export const sessionService = new SessionService();
