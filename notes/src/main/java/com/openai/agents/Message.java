package com.openai.agents;

// Simple chat message model
public class Message {
  public String role; // system|user|assistant
  public String content;

  public Message(String role, String content) {
    this.role = role;
    this.content = content;
  }
}
