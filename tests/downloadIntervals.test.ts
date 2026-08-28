import { describe, it, expect } from 'vitest'
import { msUntilCanStartTask } from '../server/utils/downloadIntervals'

describe('download intervals', () => {
  it('returns 0 when disabled', () => {
    expect(
      msUntilCanStartTask({
        now: 1000,
        lastStartedAt: 900,
        lastFinishedAt: 900,
        taskStartIntervalSec: 0,
        downloadIntervalSec: 0,
      }),
    ).toBe(0)
  })

  it('waits based on task start interval', () => {
    expect(
      msUntilCanStartTask({
        now: 1000,
        lastStartedAt: 900,
        lastFinishedAt: null,
        taskStartIntervalSec: 10,
        downloadIntervalSec: 0,
      }),
    ).toBe(9900)
  })

  it('waits based on download interval', () => {
    expect(
      msUntilCanStartTask({
        now: 1000,
        lastStartedAt: null,
        lastFinishedAt: 950,
        taskStartIntervalSec: 0,
        downloadIntervalSec: 5,
      }),
    ).toBe(4950)
  })

  it('takes max of both', () => {
    expect(
      msUntilCanStartTask({
        now: 1000,
        lastStartedAt: 900,
        lastFinishedAt: 990,
        taskStartIntervalSec: 10,
        downloadIntervalSec: 5,
      }),
    ).toBe(9900)
  })
})
