Perfect setup — with a Turbo monorepo containing Fastify and Next.js, plus GLM 5.2 and Remotion, you have everything needed to create a professional product demo video programmatically. Here's a comprehensive approach:

## Strategy: Screen Recording → Remotion Composition → GLM Enhancement

### Phase 1: Capture Your App Screens Programmatically

Since you have a Next.js app, you can capture screens/states using Playwright or Puppeteer:

```bash
# Add to your monorepo
cd apps/web
pnpm add -D playwright @playwright/test
```

Create a screen capture script:

```typescript
// packages/screen-capture/src/capture.ts
import { chromium } from 'playwright';

export async function captureScreens() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Capture different states of your app
  const screens = [
    { name: 'dashboard', url: 'http://localhost:3000/dashboard' },
    { name: 'settings', url: 'http://localhost:3000/settings' },
    { name: 'api-docs', url: 'http://localhost:3000/api-docs' },
    // Add all routes/states you want to showcase
  ];
  
  for (const screen of screens) {
    await page.goto(screen.url);
    await page.screenshot({ 
      path: `./screenshots/${screen.name}.png`,
      fullPage: true 
    });
  }
  
  await browser.close();
}
```

### Phase 2: Create Remotion Video from Screens

Set up Remotion in your monorepo:

```bash
cd apps/video
pnpm add remotion @remotion/cli
```

Create your video composition:

```typescript
// apps/video/src/AppDemo.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, 
         spring, interpolate, Sequence, staticFile } from 'remotion';

interface Screen {
  image: string;
  title: string;
  description: string;
  duration: number; // frames
}

export const AppDemo: React.FC<{ screens: Screen[] }> = ({ screens }) => {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {screens.map((screen, index) => {
        const startFrame = screens
          .slice(0, index)
          .reduce((sum, s) => sum + s.duration, 0);
        
        return (
          <Sequence key={index} from={startFrame} durationInFrames={screen.duration}>
            <ScreenTransition image={screen.image}>
              <ScreenOverlay 
                title={screen.title}
                description={screen.description}
                frame={frame - startFrame}
              />
            </ScreenTransition>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Transition component with animation
const ScreenTransition: React.FC<{ 
  image: string; 
  children: React.ReactNode 
}> = ({ image, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Entrance animation
  const scale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 100 },
  });
  
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  return (
    <AbsoluteFill style={{ 
      transform: `scale(${scale})`,
      opacity 
    }}>
      <img 
        src={staticFile(image)} 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain' 
        }} 
      />
      {children}
    </AbsoluteFill>
  );
};
```

### Phase 3: Record Dynamic Interactions

For more dynamic content, record actual interactions:

```typescript
// apps/video/src/record-demo.ts
import { chromium } from 'playwright';

export async function recordDemo() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: './recordings',
      size: { width: 1920, height: 1080 }
    }
  });
  
  const page = await context.newPage();
  
  // Demo flow
  await page.goto('http://localhost:3000');
  
  // Record interactions
  await page.click('text=Get Started');
  await page.waitForTimeout(1000);
  await page.fill('input[name="email"]', 'demo@example.com');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  // API demonstration using your Fastify server
  await page.goto('http://localhost:3000/api-demo');
  await page.click('button:has-text("Make API Request")');
  await page.waitForResponse(response => 
    response.url().includes('/api/') && response.status() === 200
  );
  
  // Stop recording
  await context.close();
  await browser.close();
}
```

### Phase 4: Enhance with GLM 5.2 for AI Voiceover

Use GLM 5.2 to generate professional narration:

```python
# packages/video-scripts/generate_voiceover.py
import glm  # GLM 5.2
import json

async def generate_script(app_description: str, screens: list):
    """Generate narration script using GLM 5.2"""
    
    prompt = f"""
    Create a professional YouTube video script for a SaaS product demo.
    App description: {app_description}
    
    Screens to cover:
    {json.dumps(screens, indent=2)}
    
    Requirements:
    - Engaging opening hook (5-10 seconds)
    - Clear explanation of each screen
    - Highlight key features and benefits
    - Professional tone suitable for tech audience
    - Include timestamps for each section
    - Call to action at end
    """
    
    # Generate script with GLM
    response = await glm.generate(
        model="glm-5.2",
        prompt=prompt,
        max_tokens=2000,
        temperature=0.7
    )
    
    return response.text
```

Convert to speech:

```python
# Using a TTS service (e.g., ElevenLabs, Google TTS)
from elevenlabs import generate, save

async def create_voiceover(script: str):
    audio = generate(
        text=script,
        voice="Adam",  # Professional voice
        model="eleven_monolingual_v1"
    )
    
    save(audio, './public/voiceover.mp3')
```

### Phase 5: Combine Everything in Remotion

```typescript
// apps/video/src/Root.tsx
import { Composition } from 'remotion';
import { AppDemo } from './AppDemo';
import { useAudioData, Audio } from '@remotion/media-utils';

export const RemotionRoot: React.FC = () => {
  const screens = [
    {
      image: 'dashboard.png',
      title: 'Powerful Dashboard',
      description: 'Monitor your entire system at a glance',
      duration: 150, // 5 seconds at 30fps
    },
    {
      image: 'api-docs.png',
      title: 'Auto-generated API Docs',
      description: 'Fastify automatically generates OpenAPI docs',
      duration: 150,
    },
    // Add all your screens
  ];

  return (
    <>
      <Composition
        id="AppDemo"
        component={AppDemo}
        durationInFrames={screens.reduce((sum, s) => sum + s.duration, 0) + 60}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ screens }}
      />
      
      <Composition
        id="AppDemoWithVoiceover"
        component={AppDemoWithAudio}
        durationInFrames={9000} // 5 minutes
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};

// Version with synchronized audio
const AppDemoWithAudio: React.FC = () => {
  const audioData = useAudioData(staticFile('voiceover.mp3'));
  
  return (
    <AbsoluteFill>
      <Audio src={staticFile('voiceover.mp3')} />
      <AppDemo screens={screens} />
    </AbsoluteFill>
  );
};
```

### Phase 6: Add Professional Effects

```typescript
// apps/video/src/effects.ts
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const useCursorAnimation = (targetX: number, targetY: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const x = spring({
    frame,
    fps,
    from: 0,
    to: targetX,
    config: { damping: 200 },
  });
  
  const y = spring({
    frame,
    fps,
    from: 0,
    to: targetY,
    config: { damping: 200 },
  });
  
  return { x, y };
};

// Keyboard typing effect
export const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const charsShown = Math.floor(interpolate(
    frame,
    [0, text.length * 2],
    [0, text.length],
    { extrapolateRight: 'clamp' }
  ));
  
  return <span>{text.substring(0, charsShown)}</span>;
};
```

### Phase 7: Automated Pipeline

Create a Turbo pipeline for one-command video generation:

```json
// turbo.json
{
  "pipeline": {
    "generate-video": {
      "dependsOn": ["capture-screens", "generate-script"],
      "outputs": ["out/video.mp4"]
    },
    "capture-screens": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "generate-script": {
      "dependsOn": [],
      "outputs": ["public/voiceover.mp3"]
    }
  }
}
```

```bash
# Single command to generate video
turbo run generate-video
```

### Pro Tips for YouTube-Optimized Videos

1. **Engaging first 5 seconds**: Use GLM to generate multiple hook variations and A/B test
2. **Chapters**: Add YouTube chapters in description based on your screen sequence
3. **End screen elements**: Leave space for YouTube end screen cards
4. **Subtitles**: Generate SRT file alongside audio for accessibility

```typescript
// Generate subtitles
const generateSubtitles = (script: string, timings: Timing[]) => {
  return timings.map((t, i) => ({
    index: i + 1,
    start: formatTime(t.start),
    end: formatTime(t.end),
    text: script[i]
  }));
};
```

This setup gives you a completely programmatic video pipeline where GLM 5.2 handles script writing, Remotion creates the video with professional animations, and your existing monorepo serves as the content source. You can iterate quickly and even A/B test different video versions for YouTube optimization.

