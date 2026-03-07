# Veteran2Veteran Site (vaintel)

VA claims information and tools site for veterans.

## Tech Stack

- **Frontend:** React 19, React Router 7, Vite 6
- **Backend:** Firebase (Firestore, Storage)
- **Styling:** CSS (publication.css)
- **Build:** Vite with Sharp image optimization

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Optimize images + build for production
npm run preview  # Preview production build
```

## Project Structure

```
src/
  main.jsx           # App entry point with routes
  Admin.jsx          # Admin panel
  BvaSearch.jsx      # BVA case search
  NexusScout.jsx     # Nexus letter tool
  firebase.js        # Firebase config
  firestore.js       # Firestore helpers
  components/        # React components
  styles/            # CSS files

guides/              # Guide content (JSON)
posts/               # Blog posts (JSON)
public/              # Static assets
```

## Content Files

- `guides/*.json` - 10 guides (filing claims, CP exams, VA math, nexus letters, etc.)
- `posts/*.json` - 9 blog posts (case law, regulations, strategies)
- `public/news.json` - News feed data
- `public/nexus-scout-data.json` - Nexus Scout tool data

## Hero Image Generation

Python scripts for generating hero images:
- `gen-hero.py` - Base hero generator
- `gen-guide-heroes.py` - Guide hero images
- `gen-post-heroes.py` - Post hero images
- `gen-resource-heroes.py` - Resource hero images

## Deployment

- Firebase Hosting configured via `firebase.json`
- Firestore rules in `firestore.rules`
- Storage rules in `storage.rules`
- Docker support via `Dockerfile`

## Key Components

- `Layout.jsx` - Main layout wrapper
- `Hero.jsx` - Hero section
- `ArticlePage.jsx` - Article/post display
- `GuidePage.jsx` - Guide display
- `Chat.jsx` - Chat interface
- `VaMathCalc.jsx` - VA math calculator
- `SearchOverlay.jsx` - Search functionality

## Recent Changes

- Initial clean site snapshot with all modified files staged
- Last commit: ab6f7ab (first commit)
