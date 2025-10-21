# Stem Separation Limitations

**Last Updated:** October 20, 2025  
**Status:** Known Limitation - Deferred to Future Iteration

## Current Implementation

RehearseKit uses **Demucs** (Meta/Facebook Research) for AI-powered stem separation. The current models produce **4 distinct stems**:

1. **Vocals** - Lead vocals and backing vocals
2. **Drums** - Drum kit (kick, snare, hi-hat, cymbals, toms)
3. **Bass** - Bass guitar, synth bass, sub-bass
4. **Other** - Everything else (guitars, keys, strings, synths, ambient)

### Models Used

- **Fast Mode:** `htdemucs` - Hybrid Transformer Demucs
- **High Quality Mode:** `htdemucs_ft` - Fine-tuned version

## The Problem

The **"Other" stem** combines multiple instrument categories into a single track:

### Instruments Merged in "Other" Track

- **Guitars:**
  - Clean electric guitar
  - Distorted electric guitar
  - Acoustic guitar
  - Guitar effects and ambience
  
- **Keyboards:**
  - Piano (acoustic and electric)
  - Synthesizers (lead and pad)
  - Organ
  - Strings (when synthesized)
  
- **Melodic Instruments:**
  - String section (orchestral)
  - Brass section
  - Woodwinds
  - Synth leads
  
- **Ambient:**
  - Background effects
  - Reverb tails
  - Atmospheric sounds

## Impact on Users

### Who is Affected?

1. **Guitarists** preparing for rehearsal
   - Cannot isolate just the guitar parts
   - Must listen to guitar + keys + other melodic elements
   - Difficult to learn complex guitar arrangements

2. **Keyboardists** learning parts
   - Cannot separate piano from synths
   - Keys mixed with guitar makes transcription harder

3. **Producers** analyzing arrangements
   - Limited visibility into individual instrument choices
   - Harder to study production techniques

### Workarounds

**Option 1: Manual Editing in DAW**
- Import the "Other" stem into your DAW
- Use EQ, filtering, and spectral editing to isolate parts
- Time-consuming but effective for critical parts

**Option 2: Use Fast Mode for Quick Practice**
- Accept the limitation for rough run-throughs
- Use high-quality mode for better separation
- Focus on vocals, drums, bass which are well-separated

**Option 3: Multiple Runs with Different Tools**
- Use RehearseKit for vocals/drums/bass
- Use additional tools (Spleeter, LALAL.AI) for other parts
- Combine stems manually

## Why This Limitation Exists

### Demucs Architecture

Demucs was trained on specific stem categories based on:
- **Common music production workflows** (vocals, drums, bass, everything else)
- **Dataset availability** (labeled training data for 4 stems)
- **Computational efficiency** (4-way classification)

### Technical Challenges

**Instrument Overlap:**
- Guitars and keys often occupy similar frequency ranges
- Harmonic content overlaps significantly
- Separation requires understanding musical context, not just frequency

**Training Data:**
- Public datasets (MUSDB18, etc.) provide 4-stem labels
- Creating 6+ stem labeled datasets requires manual work
- Commercial datasets are expensive and proprietary

**Model Complexity:**
- More stems = larger models = slower processing
- Hybrid transformer models are already computationally intensive
- Diminishing returns on quality vs. compute tradeoff

## Future Improvements (Roadmap)

### Option 1: Demucs 6-Stem Model

**Approach:** Train custom Demucs model with 6 stems
- Vocals, Drums, Bass, Guitar, Keys, Other

**Requirements:**
- Labeled training dataset (10,000+ songs)
- GPU compute resources (weeks of training)
- Audio engineering expertise for labeling

**Pros:**
- Consistent with current architecture
- High quality (Demucs is state-of-the-art)

**Cons:**
- Resource-intensive
- Requires machine learning expertise
- Ongoing maintenance as models update

### Option 2: Multi-Model Ensemble

**Approach:** Combine multiple specialized models
1. Demucs for vocals, drums, bass
2. Spleeter 5-stem for "other" breakdown
3. Blend results intelligently

**Models to Explore:**
- **Spleeter** (Deezer) - 2, 4, or 5 stem models
- **OpenUnmix** - Open-source alternative
- **Hybrid Demucs** with different configurations

**Pros:**
- Leverages existing models
- Can specialize per instrument type
- More flexible

**Cons:**
- Increased processing time (2-3x)
- Potential artifacts from model disagreements
- Complex blending logic

### Option 3: Two-Pass Processing

**Approach:** Separate in stages
1. First pass: Demucs 4-stem (vocals, drums, bass, other)
2. Second pass: Re-process "other" stem with guitar/keys-focused model
3. Output: 6 stems total

**Pros:**
- Simpler to implement than ensemble
- Retains high quality for vocals/drums/bass
- Focused improvement on problem area

**Cons:**
- Quality degradation from double processing
- Still requires specialized model for second pass
- Longer processing time

### Option 4: Hybrid Deep Learning + Source Separation

**Approach:** Combine AI with traditional signal processing
- Use Demucs for initial separation
- Apply harmonic/percussive source separation (HPSS)
- Use spectral clustering for melodic instruments
- AI classifier to assign stems to categories

**Pros:**
- Best of both worlds (AI + DSP)
- Can handle edge cases better
- More interpretable results

**Cons:**
- Complex implementation
- Requires signal processing expertise
- May introduce new artifacts

## Research & Tools to Evaluate

### Open Source Models

| Tool | Stems | Quality | Speed | License |
|------|-------|---------|-------|---------|
| **Demucs v4** | 4 | ★★★★★ | Medium | MIT |
| **Spleeter** | 2, 4, 5 | ★★★★☆ | Fast | MIT |
| **OpenUnmix** | 4 | ★★★☆☆ | Medium | MIT |
| **Demucs v3** | 4 | ★★★★☆ | Fast | MIT |

### Commercial Services

- **LALAL.AI** - 10+ stem separation (cloud service)
- **iZotope RX** - Advanced stem separation (desktop app)
- **AudioShake** - API-based separation (commercial)

### Hybrid Approaches

- **ByteSep** - Research project, not production-ready
- **Music Source Separation in the Waveform Domain** - Recent papers
- **Conditional Source Separation** - Context-aware models

## Implementation Timeline

### Phase 1 (Current): Document and Defer
- ✅ Document limitation clearly
- ✅ Provide user workarounds
- ✅ Research alternative approaches

### Phase 2 (Q1 2026): Prototype Testing
- [ ] Test Spleeter 5-stem model
- [ ] Evaluate two-pass processing quality
- [ ] Benchmark processing times
- [ ] User testing with musicians

### Phase 3 (Q2 2026): Production Implementation
- [ ] Select best approach based on Phase 2 results
- [ ] Implement chosen solution
- [ ] A/B testing with users
- [ ] Performance optimization

### Phase 4 (Q3 2026): Advanced Features
- [ ] Custom model training (if justified)
- [ ] Genre-specific separation profiles
- [ ] User feedback integration

## User Communication

### In-App Messaging

Add to results page:
```
ℹ️ Note: Guitar, keys, and other melodic instruments are combined
in the "Other" stem. For better separation, try importing this stem
into your DAW and using EQ/filtering.
```

### Documentation

- Update README with limitation disclosure
- Add to FAQ section
- Include in DAWproject README.txt

### Support

Common user questions:
- **Q:** Why can't I hear just the guitar?
  - **A:** Current model combines guitar with keys in "Other" stem. See workarounds above.
  
- **Q:** Will this improve in the future?
  - **A:** Yes! We're researching advanced models. Track progress in our roadmap.
  
- **Q:** Can I request specific instrument separation?
  - **A:** Not yet, but this is a planned feature. Join our Discord for updates.

## Conclusion

The current 4-stem limitation is a **known tradeoff** between:
- **Quality:** Demucs provides excellent separation for vocals, drums, bass
- **Speed:** Fast processing times for MVP
- **Complexity:** Simpler implementation and deployment

For the MVP phase, we accept this limitation and focus on:
1. Delivering reliable service for core use cases
2. Clear communication with users
3. Research and planning for future improvements

**The limitation does not block MVP launch**, as many users primarily need vocals/drums/bass separation for rehearsal. Advanced stem separation will be a competitive differentiator in future releases.

## References

- [Demucs GitHub](https://github.com/facebookresearch/demucs)
- [Spleeter](https://github.com/deezer/spleeter)
- [OpenUnmix](https://github.com/sigsep/open-unmix-pytorch)
- [MUSDB18 Dataset](https://sigsep.github.io/datasets/musdb.html)
- [Music Source Separation: A Survey](https://arxiv.org/abs/2010.14389)

