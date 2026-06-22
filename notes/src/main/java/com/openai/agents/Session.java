package com.openai.agents;

import java.util.ArrayList;
import java.util.List;

// A single user interaction session with a specific agent
public class Session {
  public String sessionId;
  public String agentId;
  public List<Message> history = new ArrayList<>(); // includes system/user/assistant messages
}
