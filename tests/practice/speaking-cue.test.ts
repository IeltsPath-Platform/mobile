import { describe, expect, it } from 'vitest'
import { spokenPrompt } from '@/src/features/practice/model/speaking-cue'

describe('spokenPrompt', () => {
  it('reads a short question as it is', () => {
    expect(spokenPrompt('Are you a student or do you work?')).toBe('Are you a student or do you work?')
  })

  it('reads a cue card as the topic followed by the points to cover', () => {
    expect(spokenPrompt('Describe a teacher who influenced you. You should say: who the teacher was, what subject they taught, and explain why they influenced you.'))
      .toBe('Describe a teacher who influenced you. You should say: who the teacher was, what subject they taught, and explain why they influenced you.')
  })

  it('ends the topic of a cue card with a full stop when it has none', () => {
    expect(spokenPrompt('Describe a place You should say: where it is, and why you like it.'))
      .toBe('Describe a place. You should say: where it is, and why you like it.')
  })
})
