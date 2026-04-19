import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Terminal } from "@/components/Terminal";
import { DifficultyMenu } from "@/components/DifficultyMenu";
import { DEFAULT_ROOMS, START_PATH } from "@/game/dungeon";
import { createCommandStats } from "@/game/adaptiveDungeon";

// Mock assets
vi.mock("@/assets/slate-texture.jpg", () => ({ default: "" }));
vi.mock("@/assets/logo_updated.png", () => ({ default: "" }));
vi.mock("@/assets/scroll-item.png", () => ({ default: "" }));

// Mock components that might be problematic in JSDOM
vi.mock("@/components/FireBlazes", () => ({ FireBlazes: () => <div data-testid="fire" /> }));
vi.mock("@/components/RepelDots", () => ({ RepelDots: () => <div data-testid="dots" /> }));

const mockState = {
  cwd: START_PATH,
  rooms: DEFAULT_ROOMS,
  inventory: [],
  history: [{ id: 1, kind: "system" as const, text: "Welcome" }],
  won: false,
  animating: false,
  player: { x: 5, y: 5 },
  commandStats: createCommandStats(),
};

describe("UI Components (Phase 3)", () => {
    
  describe("Terminal", () => {
    it("renders history and path", () => {
      render(<Terminal state={mockState as any} onSubmit={vi.fn()} />);
      expect(screen.getByText(/Welcome/)).toBeInTheDocument();
      // Prompt is split into multiple spans for dungeon theme
      expect(screen.getByText("adventurer")).toBeInTheDocument();
      expect(screen.getByText("~")).toBeInTheDocument();
    });

    it("submits command on Enter", () => {
      const onSubmit = vi.fn();
      render(<Terminal state={mockState as any} onSubmit={onSubmit} />);
      const input = screen.getByRole("textbox");
      
      fireEvent.change(input, { target: { value: "ls" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      expect(onSubmit).toHaveBeenCalledWith("ls");
    });
  });

  describe("DifficultyMenu", () => {
    it("renders percentage and button", () => {
      render(<DifficultyMenu onConfirm={vi.fn()} />);
      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByText(/ENTER THE DUNGEON/)).toBeInTheDocument();
    });

    it("calls onConfirm with difficulty and percentage", () => {
      const onConfirm = vi.fn();
      render(<DifficultyMenu onConfirm={onConfirm} />);
      const button = screen.getByRole("button");
      
      fireEvent.click(button);
      
      // 50% is "medium" difficulty based on tierFor
      expect(onConfirm).toHaveBeenCalledWith("medium", 50, 50);
    });

    it("shows SUMMONING when busy", () => {
      render(<DifficultyMenu onConfirm={vi.fn()} busy={true} />);
      expect(screen.getByText("SUMMONING...")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });
});
