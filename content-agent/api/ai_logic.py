# api/ai_logic.py
import os
import re
from dotenv import load_dotenv

load_dotenv()

# Template-based post generation (practical for MVP, no LLM overhead)

TEMPLATE_PATTERNS = {
    'standard': {
        'opening': [
            "Key insight from {topic}:",
            "Thought on {topic}:",
            "Here's what I learned from {topic}:",
            "Reflecting on {topic}:",
        ],
        'body': "{key_point}",
        'closing': [
            "\nWhat are your thoughts? Share in the comments!",
            "\nHappy to discuss this further!",
            "\nLet me know your perspective in the comments.",
        ]
    },
    'founder_story': {
        'opening': [
            "Started with nothing, built something.\n",
            "From zero to where we are today.\n",
            "Our journey so far:\n",
        ],
        'body': "{key_point}",
        'closing': [
            "\nEvery challenge was a learning opportunity. Grateful for the journey.",
            "\nNone of this would be possible without an amazing team and supportive community.",
            "\nThe best part? We're just getting started.",
        ]
    },
    'product_launch': {
        'opening': [
            "🚀 Excited to announce {topic}!\n",
            "🎉 We just launched {topic}!\n",
            "Introducing {topic}.\n",
        ],
        'body': "{key_point}",
        'closing': [
            "\n🙌 Special thanks to everyone who made this possible.",
            "\n✨ Ready to transform your workflow?",
            "\n🔥 Let's build the future together!",
        ]
    },
    'learning_summary': {
        'opening': [
            "3 key takeaways from {topic}:\n",
            "What I learned from {topic}:\n",
            "Lessons from {topic}:\n",
        ],
        'body': "{key_point}",
        'closing': [
            "\nWhich resonates most with you?",
            "\nLooking forward to applying these insights.",
            "\nWould love to hear your thoughts!",
        ]
    }
}

TONE_MODIFIERS = {
    'professional': {
        'prefix': "",
        'suffix': "",
        'style': 'formal'
    },
    'friendly': {
        'prefix': "",
        'suffix': " 😊",
        'style': 'conversational'
    },
    'bold': {
        'prefix': "⚡ ",
        'suffix': " 💪",
        'style': 'confident'
    }
}


def extract_topic(transcript):
    """Extract main topic from transcript"""
    sentences = [s.strip() for s in transcript.split('.') if s.strip()]
    if sentences:
        return sentences[0][:50]
    return "this topic"


def extract_key_points(transcript):
    """Extract 2-3 key sentences from transcript"""
    sentences = [s.strip() for s in transcript.split('.') if len(s.strip()) > 20]
    
    # Select meaningful sentences
    key_points = []
    for sentence in sentences[:4]:
        if len(sentence) > 15 and any(word in sentence.lower() for word in ['is', 'has', 'did', 'achieved', 'reached', 'hit', 'launched']):
            key_points.append(sentence)
    
    return key_points[:2] if key_points else sentences[:2]


def build_post_structured(transcript, template='standard', tone='professional'):
    """Build LinkedIn post using template-based approach"""
    
    template_pattern = TEMPLATE_PATTERNS.get(template, TEMPLATE_PATTERNS['standard'])
    tone_modifier = TONE_MODIFIERS.get(tone, TONE_MODIFIERS['professional'])
    
    # Extract content
    topic = extract_topic(transcript)
    key_points = extract_key_points(transcript)
    
    # Build key point text
    if key_points:
        if len(key_points) == 1:
            key_text = f"• {key_points[0]}"
        else:
            key_text = "\n".join([f"• {kp}" for kp in key_points])
    else:
        key_text = f"• {transcript[:150].rsplit(' ', 1)[0]}"
    
    # Construct post
    opening = template_pattern['opening'][hash(topic) % len(template_pattern['opening'])]
    opening = opening.format(topic=topic)
    
    body = template_pattern['body'].format(key_point=key_text)
    
    closing = template_pattern['closing'][hash(key_text) % len(template_pattern['closing'])]
    
    post = f"{tone_modifier['prefix']}{opening}\n{body}{closing}{tone_modifier['suffix']}"
    
    # Add relevant hashtags based on template
    hashtags_map = {
        'founder_story': ' #startuplife #entrepreneurship #growth',
        'product_launch': ' #innovation #launch #tech',
        'learning_summary': ' #learning #insights #professional',
    }
    
    if template in hashtags_map:
        post += hashtags_map[template]
    else:
        post += " #innovation"
    
    return post.strip()


def generate_linkedin_post(transcript, template='standard', tone='professional'):
    """Generate a LinkedIn post from transcript using template-based approach"""
    
    if not transcript or not str(transcript).strip():
        raise ValueError('Transcript is required')
    
    try:
        post = build_post_structured(transcript, template, tone)
        
        # Ensure reasonable length (LinkedIn limit ~3000 chars, but keep it concise)
        if len(post) > 1500:
            post = post[:1500].rsplit('.', 1)[0] + "."
        
        return post
    except Exception as e:
        print(f"Error generating post: {e}")
        raise
