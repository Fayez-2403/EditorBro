"""Microsoft-Decision-1 explainer for Techpe Trek (9:16, Vox template). One line per shot: line i plays over shot i.

The words are the user's own script (written in Roman Hinglish, set here in Devanagari so the voice pronounces
the Hindi well; English words stay in Latin). Their [tags] are ElevenLabs v3 audio tags: they steer the delivery
and are not spoken or stored as words. Trimmed to one minute: the "20 faislo mein ... 2 seconds barbaad" and
"calibration ... Jev se 1.5 peechhe" lines are cut, and (2026-10-11) the Techpe Trek starter line and its logo shot.

Pronunciation (SPOKEN changes only what the voice reads, never the words stored): English words go to the voice in
English, as an Indian speaker writes Hinglish (Devanagari respellings of English words made them sound odd);
numbers and acronyms are spelled out in English; फ़ैसला / फ़ैसले get a halant (फ़ैस्ला / फ़ैस्ले) so the voice says
"fais-la", not "fai-sa-la".

Facts: Microsoft Command Line, "Introducing Microsoft-Decision-1, our model for fast decision-making",
2026.10.09 (https://commandline.microsoft.com/microsoft-decision-1-model-foundry/), and its chart
"Accuracy, latency and calibration, side by side". Every number is as the source gives it.

Voiced in one continuous take by ElevenLabs (make_reel_vo.py --engine elevenlabs --voice <voice id> --max 60).
Nothing of SCRIPT is shown on screen: the shots carry their own English text (see app/src/timeline.ts).
Words the timeline or sfx_mix.py look up: probability (4), 83.5% (5), 35 and 2.5 (6), word 10 "नहीं" and 1.3% (7),
$0.042 (9).
"""

SCRIPT = [
    "[excited] अरे Microsoft भला ऐसा AI क्यों बनाएगा, जो लंबे-लंबे messages लिखता ही नहीं?",
    "[enthusiasm] मिलिए Microsoft Decision One से! ये super-fast बड़े-बड़े decisions लेने में माहिर है।",
    "[thoughtful] Normal LLMs लंबे-लंबे जवाब लिखते हैं, पर ये सीधे quick फ़ैसला सुनाता है!",
    "[confident] आप बस options दीजिए: Yes या No, multiple choice, या फिर rating!",
    "[interest] और हर option के साथ मिलती है एक calibrated probability!",
    "[excited] Accuracy की बात करें, तो 36 benchmarks पर 83.5% के साथ ये बिल्कुल number one है!",
    "[curiosity] रफ़्तार? [excited] सिर्फ़ 85 milliseconds! [bold] यानी H2O Lightning से 2.5 times, और GPT-6 Sol से पूरे 35 times तेज़!",
    "[cautious] अगर आप options का order बदल दो, फिर भी फ़ैसला नहीं बदलता। [positive] और इसका average flip rate बस 1.3%।",
    "[admiration] Xbox research ने 10,000 से ज़्यादा feedback sort किए, 14 times से भी ज़्यादा तेज़, और पूरे 200 times सस्ते में!",
    "[curiosity] और price? [excited] हर million input tokens के सिर्फ़ $0.042, और output तो बिल्कुल free!",
    "[enthusiasm] आज ही Microsoft Foundry और OpenRouter पर जाकर try कीजिए!",
    "[excited] तो अब लंबे जवाब छोड़िए, और super-fast फ़ैसले लीजिए!",
]

# (edge engine only) the same short pause after each line
PLATE_FIRST = set()
GAP = 0.3

SPOKEN = {
    # "fais-la", not "fai-sa-la"
    "फ़ैसला": "फ़ैस्ला",
    "फ़ैसले": "फ़ैस्ले",
    # numbers and acronyms, spelled out in English
    "AI": "A I",
    "LLMs": "L L Ms",
    "36": "thirty six",
    "83.5%": "eighty three point five percent",
    "85": "eighty five",
    "H2O": "H two O",
    "2.5": "two point five",
    "GPT-6": "G P T six",
    "35": "thirty five",
    "1.3%": "one point three percent",
    "10,000": "ten thousand",
    "14": "fourteen",
    "200": "two hundred",
    "$0.042": "zero point zero four two dollars",
    "OpenRouter": "Open Router",
}
