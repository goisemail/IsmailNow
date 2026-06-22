package com.openai.agents;

import com.openai.openai.OpenAiClient;
import java.io.IOException;
import java.util.*;

// Orchestrates per-session roles for multiple agents using OpenAI API directly
public class SessionManager {
  private final OpenAiClient ai;
  private final Map<String, Agent> agents = new HashMap<>();
  private final Map<String, Session> sessions = new HashMap<>();

  public SessionManager(String apiKey) {
    this.ai = new OpenAiClient(apiKey);
  }

  public void registerAgent(Agent a) {
    agents.put(a.id, a);
  }

  // Start a new session for an agent with an initial user message
  public SessionResult startSession(String agentId, String initialUserMessage) throws IOException, InterruptedException {
    Agent agent = agents.get(agentId);
    if (agent == null) throw new IllegalArgumentException("Unknown agent: " + agentId);
    String sessionId = "sess_" + UUID.randomUUID().toString();

    String systemContent = buildSystemContent(agent);
    List<Message> messages = new ArrayList<>();
    messages.add(new Message("system", systemContent));
    messages.add(new Message("user", initialUserMessage));

    String assistantReply = ai.chat(messages);

    Session s = new Session();
    s.sessionId = sessionId;
    s.agentId = agentId;
    s.history.addAll(messages);
    s.history.add(new Message("assistant", assistantReply));
    sessions.put(sessionId, s);

    return new SessionResult(sessionId, assistantReply);
  }

  // Continue an existing session with a user input
  public String send(String sessionId, String userInput) throws IOException, InterruptedException {
    Session s = sessions.get(sessionId);
    if (s == null) throw new IllegalArgumentException("Unknown session: " + sessionId);
    Agent agent = agents.get(s.agentId);
    if (agent == null) throw new IllegalStateException("Unknown agent for session");

    // Append user input
    s.history.add(new Message("user", userInput));

    // Prepend system prompt to history for safety
    List<Message> messages = new ArrayList<>();
    messages.add(new Message("system", buildSystemContent(agent)));
    messages.addAll(s.history);

    String assistantReply = ai.chat(messages);
    s.history.add(new Message("assistant", assistantReply));
    return assistantReply;
  }

  // Start a new session with a potentially different agent (safer to isolate contexts)
  public SessionResult switchAgent(String oldSessionId, String newAgentId, String initialUserMessage) throws IOException, InterruptedException {
    // We opt to start a brand new session for the new role
    return startSession(newAgentId, initialUserMessage);
  }

  private String buildSystemContent(Agent agent) {
    String base = agent.systemPrompt == null ? "" : agent.systemPrompt;
    if (agent.systemReminders == null || agent.systemReminders.isEmpty()) return base;
    StringBuilder rem = new StringBuilder();
    for (int i = 0; i < agent.systemReminders.size(); i++) {
      rem.append("\nReminder ").append(i + 1).append(": ").append(agent.systemReminders.get(i));
    }
    return base + rem.toString();
  }
}

// Helper result holder as a public static inner class for external consumers
public static class SessionResult {
  public final String sessionId;
  public final String firstReply;
  public SessionResult(String sessionId, String firstReply) {
    this.sessionId = sessionId; this.firstReply = firstReply;
  }
}
