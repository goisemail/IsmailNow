package com.openai;

import com.openai.agents.Agent;
import com.openai.agents.SessionManager;
import java.util.Collections;
import java.util.List;

public class Main {
  public static void main(String[] args) throws Exception {
    String apiKey = System.getenv("OPENAI_API_KEY");
    if (apiKey == null || apiKey.isEmpty()) {
      System.err.println("Please set OPENAI_API_KEY environment variable");
      return;
    }

    SessionManager sm = new SessionManager(apiKey);

    sm.registerAgent(new Agent("qa", "Q&A Bot", "You are a concise Q&A assistant. Answer questions succinctly.", List.of("Always cite sources if possible.")));
    sm.registerAgent(new Agent("code", "Code Helper", "You are a coding expert. Provide precise answers and brief code examples.", List.of("Ask clarifying questions if unclear.")));

    // Start a session with QA agent
    SessionManager.SessionResult r1 = sm.startSession("qa", "Explain the P=NP problem in one paragraph.");
    System.out.println("Session: " + r1.sessionId);
    System.out.println("First reply: \n" + r1.firstReply);

    // Continue the QA session
    String reply2 = sm.send(r1.sessionId, "What is the cryptographic impact?");
    System.out.println("Next reply: \n" + reply2);

    // Switch to Code agent for a new session (per-session role change)
    SessionManager.SessionResult r2 = sm.switchAgent(r1.sessionId, "code", "Write a small Java function to reverse a string.");
    System.out.println("New session (code): " + r2.sessionId);
    System.out.println("Code first reply: \n" + r2.firstReply);
  }
}
