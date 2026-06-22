package com.openai.openai;

import com.openai.agents.Message;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;

/**
 * Lightweight OpenAI Chat API client (no external dependencies).
 * Assumes environment or constructor-provided API key.
 */
public class OpenAiClient {
  private final String apiKey;
  private final HttpClient http = HttpClient.newHttpClient();

  public OpenAiClient(String apiKey) {
    this.apiKey = apiKey;
  }

  // Call chat/completions with a list of messages and return the assistant's content
  public String chat(List<Message> messages) throws IOException, InterruptedException {
    String payload = buildPayload(messages);
    HttpRequest req = HttpRequest.newBuilder()
        .uri(URI.create("https://api.openai.com/v1/chat/completions"))
        .header("Content-Type", "application/json")
        .header("Authorization", "Bearer " + apiKey)
        .POST(HttpRequest.BodyPublishers.ofString(payload))
        .build();
    HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
    return extractContent(resp.body());
  }

  private String buildPayload(List<Message> messages) {
    StringBuilder sb = new StringBuilder();
    sb.append("{\"model\":\"gpt-4\",\"messages\":[");
    for (int i = 0; i < messages.size(); i++) {
      Message m = messages.get(i);
      sb.append("{\"role\":\"").append(escapeJson(m.role)).append("\",\"content\":\"")
        .append(escapeJson(m.content)).append("\"}");
      if (i < messages.size() - 1) sb.append(",");
    }
    sb.append("]}");
    return sb.toString();
  }

  // Very small JSON escaper for values inserted into payloads
  private String escapeJson(String s) {
    if (s == null) return "";
    return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
  }

  // Minimal parser: extract the first assistant content from the response
  private String extractContent(String json) {
    String marker = "\"content\":";
    int idx = json.indexOf(marker);
    if (idx < 0) return "";
    int startQuote = json.indexOf('"', idx + marker.length());
    if (startQuote < 0) return "";
    int i = startQuote + 1;
    StringBuilder out = new StringBuilder();
    boolean escaped = false;
    while (i < json.length()) {
      char c = json.charAt(i);
      if (escaped) {
        if (c == 'n') out.append('\n');
        else if (c == 'r') out.append('\r');
        else if (c == 't') out.append('\t');
        else out.append(c);
        escaped = false;
      } else {
        if (c == '\\') {
          escaped = true;
        } else if (c == '"') {
          break;
        } else {
          out.append(c);
        }
      }
      i++;
    }
    return out.toString();
  }
}
