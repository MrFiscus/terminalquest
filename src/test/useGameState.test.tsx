import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../hooks/useGameState';

// Mock dependencies that rely on browser/DOM or contextual state
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('../game/audio', () => ({
  unlockGameAudio: vi.fn(),
  startGameAmbience: vi.fn(),
  stopGameAmbience: vi.fn(),
  playGameSound: vi.fn(),
  playFootstep: vi.fn(),
  playCommandSound: vi.fn()
}));

describe('useGameState Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default states', () => {
      const onOpenProfile = vi.fn();
      const { result } = renderHook(() => useGameState({ onOpenProfile }));

      expect(result.current.state.cwd).toBe('/home/user');
      expect(result.current.state.inventory).toEqual([]);
      expect(result.current.state.history.length).toBeGreaterThan(0); // Should have welcome message
      expect(result.current.state.won).toBe(false);
      expect(result.current.state.animating).toBe(false);
    });
  });

  describe('Core Actions', () => {
    it('handles submit of basic commands (pwd)', async () => {
      const onOpenProfile = vi.fn();
      const { result } = renderHook(() => useGameState({ onOpenProfile }));

      const initialHistoryCount = result.current.state.history.length;

      await act(async () => {
        await result.current.submit('pwd');
      });

      // After a command, history length increases (input echo + result + prompt)
      expect(result.current.state.history.length).toBeGreaterThan(initialHistoryCount);
      // Find the output line which will be from 'pwd'
      const outputLine = result.current.state.history.find(h => h.kind === 'output' && h.text === '/home/user');
      expect(outputLine).toBeDefined();
    });

    it('handles submit of invalid commands', async () => {
      const onOpenProfile = vi.fn();
      const { result } = renderHook(() => useGameState({ onOpenProfile }));

      await act(async () => {
        await result.current.submit('notarealcmd');
      });

      const errorTokens = result.current.state.history.filter(h => h.kind === 'error');
      expect(errorTokens.length).toBeGreaterThan(0);
      expect(errorTokens[errorTokens.length - 1].text).toMatch(/command not found/i);
    });

    it('routes plain-English help questions to the Dungeon Master without command errors', async () => {
      const onOpenProfile = vi.fn();
      const { result } = renderHook(() => useGameState({ onOpenProfile }));

      await act(async () => {
        await result.current.submit('what does mv do?');
      });

      const errorTokens = result.current.state.history.filter(h => h.kind === 'error');
      expect(errorTokens.some(h => /command not found/i.test(h.text))).toBe(false);
    });

    it('can load a generated level', () => {
      const onOpenProfile = vi.fn();
      const { result } = renderHook(() => useGameState({ onOpenProfile }));

      const mockLevel = {
        flavor: 'A spooky cave',
        goal: 'find ghost',
        requiredCommands: ['ls', 'cd'],
        winCondition: 'mv ghost /home/user/inventory',
        roomMap: {
          '/home/user': {
            name: 'Home',
            path: '/home/user',
            hasParent: false,
            description: 'Start',
            files: [],
            doors: [],
            npcs: [],
            mapTiles: [],
            spawn: { x: 5, y: 5 }
          }
        },
        targetFile: 'ghost.txt'
      };

      act(() => {
        result.current.loadLevel(mockLevel as any, 'Cave Level', 'Go forth!');
      });

      expect(result.current.state.rooms['/home/user']).toBeDefined();
      expect(result.current.state.goal).toBe('find ghost');
      expect(result.current.state.winCondition).toBe('mv ghost.txt ~/inventory');
    });
  });

  describe('Edge Cases', () => {
    it('blocks command submission when won', async () => {
      const onOpenProfile = vi.fn();
      const { result } = renderHook(() => useGameState({ onOpenProfile }));

      // Force game state to won by achieving the goal 
      act(() => {
        result.current.loadLevel({
          flavor: '', goal: '', requiredCommands: [], winCondition: 'mv ghost.txt ~/inventory',
          roomMap: { '/home/user': { name: 'Home', path: '/home/user', hasParent: false, description: '', files: [{name: 'ghost.txt'}], doors: [], npcs: [], mapTiles: [], tiles: [], width: 10, height: 10, spawn: { x: 5, y: 5 } } },
          targetFile: 'ghost.txt'
        } as any, '', '');
      });
      
      await act(async () => {
        // execute victory
        await result.current.submit('mv ghost.txt ~/inventory');
      });
      
      expect(result.current.state.won).toBe(true);

      const historyCountAfterWin = result.current.state.history.length;
      
      await act(async () => {
        await result.current.submit('ls');
      });
      
      // History should not increment at all because it early returns when won
      expect(result.current.state.history.length).toBe(historyCountAfterWin);
    });

    it('submitting empty command does not execute or crash', async () => {
      const onOpenProfile = vi.fn();
      const { result } = renderHook(() => useGameState({ onOpenProfile }));

      const initialHistoryCount = result.current.state.history.length;

      await act(async () => {
        await result.current.submit('   ');
      });

      // It appends the input line, but NO output or error line
      expect(result.current.state.history.length).toBe(initialHistoryCount + 1);
      const lastLine = result.current.state.history[result.current.state.history.length - 1];
      expect(lastLine.kind).toBe('input');
      expect(lastLine.text).toMatch(/user@dungeon:\/home\/user\$ \s*/);
    });
  });
});
