const fs = require('fs');

const apiKey = 'AIzaSyAW0EGe5JPYYCuDfez1fLmNu6-HfcTAPu0';
const model = 'gemini-3.1-flash-image-preview';

async function generateImage(prompt, outputPath) {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: '9:16' }
        },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API error: ${res.status}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Collect text and image parts separately
    const textParts = [];
    let imageSaved = false;

    for (const part of parts) {
      if (part.text) {
        textParts.push(part.text);
      }
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        fs.writeFileSync(outputPath, buffer);
        imageSaved = true;
      }
    }

    // Display structured response
    const baseName = outputPath.replace(/\.\w+$/, '');
    console.log('\n' + '='.repeat(60));
    console.log(`  ${baseName}`);
    console.log('='.repeat(60));

    if (imageSaved) {
      console.log(`  [IMAGE] Saved to ${outputPath}`);
    } else {
      console.log('  [WARNING] No image in response');
    }

    if (textParts.length > 0) {
      console.log('-'.repeat(60));
      console.log('  Response Text:');
      console.log('-'.repeat(60));
      const fullText = textParts.join('\n');
      // Parse markdown-style formatting for terminal readability
      const formatted = fullText
        .replace(/^### (.+)$/gm, '\n  ### $1')
        .replace(/^## (.+)$/gm, '\n  ## $1')
        .replace(/^# (.+)$/gm, '\n  # $1')
        .replace(/^\* (.+)$/gm, '    - $1')
        .replace(/^- (.+)$/gm, '    - $1')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/`(.+?)`/g, '$1');
      console.log(formatted);
    }

    // Show finish reason and token usage if available
    if (candidate?.finishReason) {
      console.log('-'.repeat(60));
      console.log(`  Finish Reason: ${candidate.finishReason}`);
    }
    if (data.usageMetadata) {
      const u = data.usageMetadata;
      console.log(`  Tokens — Prompt: ${u.promptTokenCount || 0}, Response: ${u.candidatesTokenCount || u.totalTokenCount || 0}`);
    }
    console.log('='.repeat(60) + '\n');
  } catch (err) {
    console.error('Generation failed for', outputPath, err);
  }
}

async function run() {
  const tasks = [
    {
      prompt: "A modern infographic showing a timeline of VA claim delays. Design a horizontal timeline spanning from left to right, representing 10-30 years. Use navy blue (#1A3A52) as the primary color with deep orange (#D97706) accents. Left side: Start point labeled 'Claim Submitted' with a veteran silhouette icon. Center: Multiple milestone markers showing 'Year 5,' 'Year 10,' 'Year 20,' 'Year 30' - each with a faded veteran icon appearing progressively more worn/discouraged. Right side: End point labeled 'Claim Decided' with an older veteran silhouette looking exhausted. Overlay text statistics: 'Average Wait: 10-30 Years', 'Percentage of Claims Pending: 30%', 'Veterans Who Give Up: 40%'. Style: Clean, modern, high contrast. Use linear gradient from navy to lighter blue along the timeline. Include subtle animated arrow showing time progression. No photographic elements - geometric/minimalist design. 9:16 aspect ratio.",
      output: 'VA_Claim_Delay_Timeline.png'
    },
    {
      prompt: "A tech-forward visualization of VA's VBAAP (Veteran Benefits Automation Platform) system. Design a 3D-style infographic showing: Center: Large gear/cog system representing the algorithm, rendered in deep orange (#D97706) and dark gray. Gears should appear to be processing/turning. Around the gears: Multiple claim documents (shown as white rectangles with red 'DENIED' stamps) being routed through the system. Show digital pathways (flowing lines) moving claims through the gears. Left side: Input icon showing claims entering the system ('Claims Submitted - 100,000+'). Right side: Output showing rejections leaving the system ('Automated Denials - +40%'). Foreground: A small veteran silhouette looking up at the massive gear system, conveying scale/helplessness. Color scheme: Navy blue (#1A3A52) background, deep orange (#D97706) gears, red (#DC2626) denied stamps, white accents. Text overlay statistics: 'VBAAP: Algorithmic Intake', 'Automated Denial Risk: +40%', 'One Missing Keyword = Denial'. Style: Modern, slightly ominous but professional. No photographic realism - stylized, vector-like illustration. High contrast for vertical video visibility. 9:16 aspect ratio.",
      output: 'VBAAP_Automation_Visual.png'
    },
    {
      prompt: "A modern reimagining of the 'David vs. Goliath' metaphor applied to veterans vs. AI systems. Design a split-composition image: Left side: A small veteran silhouette (standing with confidence, but noticeably smaller scale) holding a simple slingshot, representing traditional claim-filing methods. Right side: A massive, towering digital AI algorithm visualization - represented as a giant geometric shape (pyramid of interconnected nodes, or digital monolith) looming over the veteran. Center: Empty space between them, emphasizing the scale difference. Lightning bolt or digital energy crackling between the two, suggesting conflict. Color scheme: Navy blue (#1A3A52) background, deep orange (#D97706) accents for the AI figure, white highlights on the veteran. Text overlay: 'David vs. Goliath', 'Veteran vs. Machine Learning', 'The Playing Field Is Not Level'. Style: Modern, bold, slightly dramatic. Use geometric shapes for the AI figure (avoid photorealism). The veteran should appear human but stylized/simplified. High contrast for visibility. 9:16 aspect ratio.",
      output: 'David_vs_Goliath.png'
    },
    {
      prompt: "A split-screen 'Before & After' infographic comparing the traditional VA claims process vs. the Counter-AI optimized process. LEFT SIDE (Before - Messy): Background color: Light red/pink tint (#FEE2E2). Show a chaotic, tangled mess of documents, timelines, and frustrated faces. Include visual elements: 15-page decision letter (shown stacked/disorganized), stopwatch showing '10-30 Years,' dollar sign labeled '$1,250/hr,' confused veteran face, question marks floating around. Text labels: 'Predatory Fees,' 'Decade-Long Delays,' 'Confusion,' 'Manual Process'. Visual metaphor: Papers flying/scattered, tangled lines, red X marks. RIGHT SIDE (After - Clean): Background color: Light green/mint tint (#D1FAE5). Show an organized, streamlined process. Include visual elements: Clean evidence packet (organized pages stacked neatly), stopwatch showing '60 Seconds,' zero/free symbol ('$0 Fees'), confident veteran smiling, checkmarks, green upward arrow. Text labels: 'Legal Grounding,' 'Rapid Decisioning,' 'Evidence-Based,' 'Streamlined'. Visual metaphor: Clean lines, organized flow, checkmarks, ascending arrows. Center divider: Bold vertical line in deep orange (#D97706) separating the two sides. Bottom text comparison: LEFT: 'Traditional: 15+ Years, Expensive, Confusing', RIGHT: 'Counter-AI: 60 Seconds, Free, Clear'. Style: Modern infographic style. Use icons and simplified shapes rather than photorealism. High contrast for video visibility. 9:16 aspect ratio.",
      output: 'Before_After_Split_Screen.png'
    }
  ];

  for (const task of tasks) {
    console.log('Generating', task.output);
    await generateImage(task.prompt, task.output);
  }
  console.log('Done!');
}

run();
