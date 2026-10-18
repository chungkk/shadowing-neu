/** Giao diện chung cho player YouTube và player file local. */
export type PlayerHandle = {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  getTime(): number;
  setRate(rate: number): void;
};
