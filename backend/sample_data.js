/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  SAMPLE DATA — Demo Transcripts                      ║
 * ║  Use these in the frontend textarea for quick demo   ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Usage:
 *   node utils/sampleData.js
 *   → Prints a sample transcript to console for copy-paste
 *
 *   Or import in tests:
 *   const { SAMPLE_TRANSCRIPT } = require('./utils/sampleData');
 */

const SAMPLE_TRANSCRIPT = `
Doctor: Good morning. Please come in and have a seat. What brings you in today?

Patient: Good morning, Doctor. I've been having really bad headaches for the past 3 days. The pain is mostly on the right side of my head and it's been throbbing.

Doctor: I see. Can you rate the pain on a scale of 1 to 10?

Patient: I'd say around 7 or 8. It's quite severe.

Doctor: Is the headache constant or does it come and go?

Patient: It's mostly constant but it gets worse in the mornings. I also feel a bit nauseous when the pain peaks.

Doctor: Any vomiting? Sensitivity to light or sound?

Patient: Yes, light really bothers me. No vomiting yet but I feel like I might. And loud sounds make it worse too.

Doctor: Have you had headaches like this before?

Patient: I get occasional headaches but nothing this bad. I had migraines once about 2 years ago.

Doctor: Any recent fever, neck stiffness, or visual changes?

Patient: No fever. No neck stiffness. But my vision did get a little blurry yesterday for about 10 minutes, then it went back to normal.

Doctor: That's important to note. Any known medical conditions I should be aware of?

Patient: I have hypertension. Been on Amlodipine 5mg once daily for about a year and a half.

Doctor: Any allergies to medications?

Patient: Yes, I'm allergic to Aspirin. It causes me stomach bleeding.

Doctor: Understood. I'll check your blood pressure now. *checking* It reads 148 over 92. A little elevated today. Your pulse is 84. Let me also check your temperature. It's 37.1 degrees Celsius, so no fever.

Doctor: Have you been sleeping well? Any stress lately?

Patient: Not really. Work has been very stressful this week. I've been sleeping only 4 to 5 hours a night.

Doctor: That can certainly be a trigger. Are you currently taking anything for the headache?

Patient: I took Paracetamol 500mg twice yesterday but it barely helped.

Doctor: Okay. Based on what you've described — the throbbing right-sided headache, light and sound sensitivity, nausea, the brief visual disturbance, and the history of migraines — this presentation is consistent with a migraine episode. The elevated BP may be contributing as well.

Doctor: I'm going to document this carefully. I'll note the migraine history, the hypertension, and the Aspirin allergy. We'll avoid NSAIDs entirely.

Patient: Is it serious, Doctor?

Doctor: The symptoms are consistent with what we'd expect for migraine. However the brief visual episode is something we'll want to monitor. I want you to rest in a dark quiet room, stay hydrated, and we'll review again in 2 days. If the visual symptoms return or you develop fever or neck stiffness, go to emergency immediately.

Patient: Okay, I understand. Thank you Doctor.

Doctor: Take care. The nurse will give you the prescription.
`.trim();

const SAMPLE_TRANSCRIPT_SHORT = `
Doctor: What seems to be the problem today?

Patient: I have a sore throat and fever since yesterday. Temperature was 38.8 at home. I also have body aches.

Doctor: Any cough or runny nose?

Patient: Mild dry cough. No runny nose.

Doctor: Any known allergies? Current medications?

Patient: No allergies. I take Metformin 500mg twice daily for diabetes.

Doctor: Let me check your throat. Yes, it looks red and inflamed. Tonsils slightly enlarged. Your temperature right now is 38.6 degrees. Pulse 92.

Doctor: This looks like a viral upper respiratory infection. I'll document this. Please rest and take fluids. Paracetamol for fever. If symptoms worsen in 48 hours, come back.
`.trim();

// ── CLI usage ─────────────────────────────────────────────────────────────────
if (require.main === module) {
  console.log('\n' + '='.repeat(60));
  console.log('🩺 DOCTOR COPILOT — Sample Transcript (Full)');
  console.log('='.repeat(60));
  console.log(SAMPLE_TRANSCRIPT);
  console.log('\n' + '='.repeat(60));
  console.log('🩺 DOCTOR COPILOT — Sample Transcript (Short)');
  console.log('='.repeat(60));
  console.log(SAMPLE_TRANSCRIPT_SHORT);
  console.log('\n✅ Copy either transcript and paste into the frontend textarea.\n');
}

module.exports = { SAMPLE_TRANSCRIPT, SAMPLE_TRANSCRIPT_SHORT };