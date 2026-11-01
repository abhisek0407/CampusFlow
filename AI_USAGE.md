# AI Usage Declaration — CampusFlow (OrchestrAI)

In accordance with Section 6 of the Hackathon Rules, this document explicitly declares all AI usage within the product and throughout the development process.

---

## 1. AI Inside the Product

### Models & APIs Used
- **Gemini / Local LLM Integration**: Used for Natural Language Processing (NLP) in venue requests and faculty schedule change assistants.
- **Rule-Based & Semantic Extraction Engine**: Fallback NLP pipeline (`backend/lib/aiParser.js`) ensuring 100% functionality even when offline or if external API credits run out.

### Capabilities & Purpose
1. **Plain English & Hinglish Request Extraction**:
   - Converts natural colloquial requests (e.g. *"humko main audi chahiye Monday 11 am se 1 pm Spectra opening ke liye"* or *"Dramatics needs SH-1 Thursday 6 to 9 pm"*) into structured booking parameters (`day`, `from_period`, `to_period`, `attendance`, `room_types`, `needs`, `category`).
2. **Faculty Schedule Change Assistant**:
   - Understands faculty natural language leave/rescheduling requests (e.g. *"I am travelling for a conference on Monday, please reschedule my lecture"*).
3. **Decision Explanations**:
   - Generates transparent, human-readable explanations answering user queries such as *"Why was my booking rejected?"* or *"Why was this class scheduled at 8 AM?"*.

---

## 2. What AI Is NOT Allowed to Decide

> **CRITICAL RULE**: Under Section 6, the LLM is **NEVER** permitted to decide whether a schedule or booking is valid. 

All decisions, validity checks, and allocations are governed exclusively by **deterministic code and Google OR-Tools CP-SAT constraint solver**:
- **Zero Hallucination Tolerance**: LLM outputs only serve as structured drafts presented to the user for review.
- **Strict Solver Authority**: Every assignment passes through hard constraint verification (H1 to H14). If a constraint is violated, the code solver rejects or re-routes it.
- **Admin Approval Gate**: AI cannot directly modify the active timetable; all proposals require explicit Admin approval.

---

## 3. Location of Prompts & Parsing Logic

- **Parser & Grammar Rules**: `backend/lib/aiParser.js`
- **Faculty Assistant Engine**: `backend/app/api/ai/faculty-assistant/route.js`
- **Decision Explanations**: `backend/app/api/ai/explain/route.js`

---
