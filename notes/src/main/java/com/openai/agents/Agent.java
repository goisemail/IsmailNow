package com.openai.agents;

import java.util.List;

// Represents an agent with a role/prompt and optional reminders
public class Agent {
  public String id;
  public String name;
  public String systemPrompt;
  public List<String> systemReminders;

  public Agent(String id, String name, String systemPrompt, List<String> systemReminders) {
    this.id = id;
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.systemReminders = systemReminders;
  }
}
