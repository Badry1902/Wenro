"""Generates the flat [DEMO] illustrations in public/demo/ (brand colours, no photos, no real places' imagery).
Run: python3 scripts/make-demo-illustrations.py"""
import math, os, random

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "demo")
W, H = 1200, 900
BLUE, APRICOT, IVORY, INK = "#3046D9", "#F59A6B", "#FFF9F1", "#232B45"
SKY, SEA1, SEA2, SEA3, SAND, SAND2, NIGHT = "#CFE0FF", "#4F7BE8", "#3046D9", "#22339F", "#F6D8B5", "#EFC291", "#1B2140"

def svg(body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>')

def grad(id_, stops, vertical=True):
    a = 'x1="0" y1="0" x2="0" y2="1"' if vertical else 'x1="0" y1="0" x2="1" y2="0"'
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{id_}" {a}>{s}</linearGradient>'

def waves(y, color, amp=14, period=160, opacity=1):
    pts = [f"M0 {y}"]
    for x in range(0, W + period, period):
        pts.append(f"Q{x + period/4} {y - amp} {x + period/2} {y} T{x + period} {y}")
    pts.append(f"L{W} {H} L0 {H} Z")
    return f'<path d="{" ".join(pts)}" fill="{color}" opacity="{opacity}"/>'

def dunes(y, color, seed, amp=60):
    r = random.Random(seed)
    d = f"M0 {y}"
    x = 0
    while x < W:
        w = r.randint(220, 420)
        d += f" Q{x + w/2} {y - r.randint(amp//2, amp)} {x + w} {y + r.randint(-20, 20)}"
        x += w
    return f'<path d="{d} L{W} {H} L0 {H} Z" fill="{color}"/>'

def sun(cx, cy, r, color=APRICOT, glow=True):
    g = f'<circle cx="{cx}" cy="{cy}" r="{r*1.7}" fill="{color}" opacity="0.18"/>' if glow else ""
    return g + f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{color}"/>'

def boat(x, y, s=1, hull=IVORY, cabin=BLUE):
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'<path d="M-170 0 L170 0 L130 52 L-140 52 Z" fill="{hull}"/>'
            f'<rect x="-90" y="-58" width="150" height="58" rx="10" fill="{cabin}"/>'
            f'<rect x="-70" y="-44" width="34" height="22" rx="4" fill="{SKY}"/><rect x="-26" y="-44" width="34" height="22" rx="4" fill="{SKY}"/>'
            f'<rect x="-40" y="-86" width="70" height="28" rx="6" fill="{hull}"/><rect x="-170" y="18" width="340" height="8" fill="{APRICOT}"/></g>')

def sailboat(x, y, s=1):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M-120 0 L120 0 L90 40 L-95 40 Z" fill="{INK}"/>'
            f'<path d="M0 -10 L0 -260 L110 -10 Z" fill="{IVORY}"/><path d="M-8 -10 L-8 -220 L-100 -10 Z" fill="{APRICOT}"/>'
            f'<rect x="-3" y="-270" width="6" height="270" fill="{INK}"/></g>')

def fish(x, y, s=1, color=APRICOT, flip=False):
    f = -1 if flip else 1
    return (f'<g transform="translate({x} {y}) scale({s*f} {s})"><ellipse cx="0" cy="0" rx="34" ry="18" fill="{color}"/>'
            f'<path d="M30 0 L56 -16 L56 16 Z" fill="{color}"/><circle cx="-18" cy="-4" r="4" fill="{INK}"/></g>')

def coral(x, y, color, s=1):
    return (f'<g transform="translate({x} {y}) scale({s})" fill="none" stroke="{color}" stroke-width="18" stroke-linecap="round">'
            f'<path d="M0 0 L0 -120 M0 -60 L-50 -110 M0 -80 L45 -140 M-50 -110 L-60 -150 M45 -140 L70 -170"/></g>')

def bubbles(seed, n=14, x0=0, x1=W, y0=0, y1=H):
    r = random.Random(seed)
    return "".join(f'<circle cx="{r.randint(x0, x1)}" cy="{r.randint(y0, y1)}" r="{r.randint(5, 16)}" fill="none" stroke="{IVORY}" stroke-width="3" opacity="0.7"/>' for _ in range(n))

def stars(seed, n=60, ymax=500):
    r = random.Random(seed)
    return "".join(f'<circle cx="{r.randint(0, W)}" cy="{r.randint(0, ymax)}" r="{r.choice([1.5, 2, 2.5, 3.5])}" fill="{IVORY}" opacity="{r.choice([0.5, 0.8, 1])}"/>' for _ in range(n))

def palm(x, y, s=1):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M0 0 Q20 -120 -10 -240" stroke="{INK}" stroke-width="18" fill="none"/>'
            + "".join(f'<path d="M-10 -240 Q{dx} {dy} {ex} {ey}" stroke="#1F7A4D" stroke-width="16" fill="none" stroke-linecap="round"/>'
                      for dx, dy, ex, ey in [(-90, -290, -170, -220), (60, -300, 140, -230), (-40, -330, -110, -300), (30, -340, 100, -320)])
            + "</g>")

def camel(x, y, s=1, c=INK):
    return (f'<g transform="translate({x} {y}) scale({s})" fill="{c}"><ellipse cx="0" cy="-80" rx="90" ry="45"/>'
            f'<ellipse cx="-20" cy="-120" rx="40" ry="30"/><path d="M70 -95 Q120 -150 115 -190 L140 -195 Q150 -140 100 -70 Z"/>'
            f'<ellipse cx="135" cy="-200" rx="26" ry="14"/>'
            + "".join(f'<rect x="{lx}" y="-60" width="14" height="80" rx="6"/>' for lx in (-70, -40, 30, 60)) + "</g>")

def quad(x, y, s=1):
    return (f'<g transform="translate({x} {y}) scale({s})"><rect x="-110" y="-70" width="220" height="50" rx="18" fill="{APRICOT}"/>'
            f'<rect x="-40" y="-110" width="80" height="40" rx="12" fill="{INK}"/><path d="M40 -110 L80 -140 L95 -132" stroke="{INK}" stroke-width="10" fill="none"/>'
            f'<circle cx="-75" cy="-10" r="42" fill="{INK}"/><circle cx="75" cy="-10" r="42" fill="{INK}"/>'
            f'<circle cx="-75" cy="-10" r="16" fill="{SAND}"/><circle cx="75" cy="-10" r="16" fill="{SAND}"/></g>')

def tent(x, y, s=1):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M-160 0 L0 -130 L160 0 Z" fill="{APRICOT}"/>'
            f'<path d="M-40 0 L0 -130 L40 0 Z" fill="{INK}" opacity="0.85"/><path d="M-160 0 L160 0" stroke="{INK}" stroke-width="6"/></g>')

def fire(x, y):
    return (f'<g transform="translate({x} {y})"><path d="M0 -70 Q30 -30 18 0 L-18 0 Q-30 -30 0 -70 Z" fill="{APRICOT}"/>'
            f'<path d="M0 -40 Q12 -18 8 0 L-8 0 Q-12 -18 0 -40 Z" fill="#FFD9A0"/><rect x="-40" y="0" width="80" height="10" rx="5" fill="{INK}"/></g>')

def mountains(y, color, seed):
    r = random.Random(seed); d = f"M0 {y}"; x = 0
    while x < W:
        w = r.randint(160, 300); d += f" L{x + w/2} {y - r.randint(120, 260)} L{x + w} {y}"; x += w
    return f'<path d="{d} L{W} {H} L0 {H} Z" fill="{color}"/>'

def scene(name, title, body):
    with open(os.path.join(OUT, f"{name}.svg"), "w") as f:
        f.write(svg(body, title))

defs = lambda *g: "<defs>" + "".join(g) + "</defs>"

scene("sea-boat", "Illustration: a day boat on the Red Sea",
      defs(grad("s", [(0, "#BFD3FF"), (1, IVORY)])) + f'<rect width="{W}" height="{H}" fill="url(#s)"/>' + sun(930, 200, 80)
      + waves(470, SEA1, 12) + boat(560, 470, 1.3) + waves(560, SEA2, 16, 200) + waves(690, SEA3, 18, 240))
scene("reef", "Illustration: coral reef with fish",
      defs(grad("w", [(0, "#5B8BF0"), (1, SEA3)])) + f'<rect width="{W}" height="{H}" fill="url(#w)"/>'
      + coral(180, 900, APRICOT, 1.6) + coral(420, 900, "#FFB892", 1.1) + coral(900, 900, APRICOT, 1.9) + coral(1080, 900, IVORY, 1.0)
      + f'<path d="M0 820 Q300 760 600 830 T1200 800 L1200 900 L0 900 Z" fill="{SAND}"/>'
      + fish(600, 380, 1.6) + fish(760, 470, 1.1, IVORY, True) + fish(420, 520, 0.9, "#FFD27A") + fish(860, 300, 0.8, APRICOT, True)
      + bubbles(3, 18, 300, 1100, 80, 600))
scene("island", "Illustration: a sandy island in turquoise water",
      defs(grad("s", [(0, "#BFD3FF"), (1, IVORY)])) + f'<rect width="{W}" height="{H}" fill="url(#s)"/>' + sun(240, 170, 70)
      + waves(430, "#62C7D9", 10) + f'<ellipse cx="640" cy="520" rx="420" ry="70" fill="{SAND}"/>'
      + palm(560, 510, 1.0) + palm(720, 515, 0.8)
      + "".join(f'<g transform="translate({x} 500)"><path d="M0 0 L0 -90" stroke="{INK}" stroke-width="6"/><path d="M-60 -80 Q0 -130 60 -80 Z" fill="{c}"/></g>' for x, c in ((420, APRICOT), (880, BLUE)))
      + waves(600, "#45B3CC", 14, 200) + waves(720, SEA1, 16, 240))
scene("dolphins", "Illustration: dolphins jumping beside a boat",
      defs(grad("s", [(0, "#BFD3FF"), (1, IVORY)])) + f'<rect width="{W}" height="{H}" fill="url(#s)"/>' + sun(980, 160, 60)
      + waves(480, SEA1, 12)
      + "".join(f'<g transform="translate({x} {y}) rotate({r})"><path d="M-120 0 Q-20 -90 120 -10 Q40 -20 -120 0 Z" fill="#5A6BB0"/><path d="M-10 -55 L10 -95 L30 -50 Z" fill="#5A6BB0"/><path d="M110 -12 L150 -40 L140 0 Z" fill="#5A6BB0"/></g>'
                for x, y, r in ((420, 470, -18), (700, 440, -8)))
      + waves(560, SEA2, 16, 200) + boat(1000, 560, 0.7) + waves(700, SEA3, 18, 240))
scene("diver", "Illustration: a scuba diver above a reef",
      defs(grad("w", [(0, "#4D79E6"), (1, "#18257A")])) + f'<rect width="{W}" height="{H}" fill="url(#w)"/>'
      + "".join(f'<path d="M{x} 0 L{x+80} 0 L{x-120} 900 L{x-200} 900 Z" fill="{IVORY}" opacity="0.06"/>' for x in (300, 650, 950))
      + '<g transform="translate(560 380) rotate(-12)">'
      + f'<rect x="-160" y="-30" width="260" height="60" rx="30" fill="{INK}"/><rect x="-120" y="-62" width="150" height="34" rx="17" fill="{APRICOT}"/>'
      + f'<circle cx="130" cy="-4" r="40" fill="{INK}"/><rect x="118" y="-22" width="44" height="26" rx="8" fill="#9FE3F0"/>'
      + f'<path d="M-160 -10 L-300 -60 L-300 10 Z M-160 10 L-290 60 L-280 90 Z" fill="{APRICOT}"/></g>'
      + bubbles(9, 16, 600, 760, 80, 330) + coral(200, 900, APRICOT, 1.4) + coral(1000, 900, IVORY, 1.2)
      + f'<path d="M0 840 Q400 790 800 850 T1200 830 L1200 900 L0 900 Z" fill="{SAND2}"/>')
scene("glass-boat", "Illustration: a glass-bottom boat with fish below",
      defs(grad("s", [(0, "#BFD3FF"), (1, IVORY)]), grad("w", [(0, SEA1), (1, SEA3)])) + f'<rect width="{W}" height="380" fill="url(#s)"/>'
      + f'<rect y="380" width="{W}" height="520" fill="url(#w)"/>' + boat(600, 380, 1.4)
      + f'<rect x="420" y="452" width="330" height="40" rx="10" fill="#9FE3F0" opacity="0.9"/>'
      + fish(380, 640, 1.2) + fish(760, 700, 1.4, IVORY, True) + fish(560, 800, 0.9, "#FFD27A") + coral(140, 900, APRICOT, 1.2) + coral(1060, 900, APRICOT, 1.5))
scene("sunset", "Illustration: a sailboat at sunset",
      defs(grad("s", [(0, "#F7B48E"), (0.6, "#FCE3CF"), (1, IVORY)])) + f'<rect width="{W}" height="{H}" fill="url(#s)"/>' + sun(600, 470, 120, "#F28A55")
      + waves(500, "#5A6BB0", 10) + sailboat(380, 520, 1.1) + waves(600, SEA2, 14, 200) + waves(720, SEA3, 16, 240))
scene("quad", "Illustration: a quad bike in the desert",
      defs(grad("s", [(0, "#FCE3CF"), (1, IVORY)])) + f'<rect width="{W}" height="{H}" fill="url(#s)"/>' + sun(980, 180, 70)
      + mountains(520, "#E8B98C", 4) + dunes(600, SAND2, 5) + quad(560, 700, 1.4) + dunes(760, SAND, 6, 40)
      + f'<path d="M260 700 Q160 690 60 720" stroke="{SAND2}" stroke-width="22" fill="none" stroke-linecap="round" opacity="0.8"/>')
scene("camel", "Illustration: a camel crossing the dunes",
      defs(grad("s", [(0, "#F9C9AE"), (1, IVORY)])) + f'<rect width="{W}" height="{H}" fill="url(#s)"/>' + sun(300, 300, 110)
      + mountains(560, "#E9B28A", 7) + dunes(620, SAND2, 8) + camel(700, 640, 1.3) + dunes(780, SAND, 9, 40))
scene("stars", "Illustration: a desert camp under the stars",
      defs(grad("n", [(0, NIGHT), (1, "#3A3F78")])) + f'<rect width="{W}" height="{H}" fill="url(#n)"/>' + stars(11, 90)
      + f'<circle cx="960" cy="150" r="46" fill="{IVORY}"/><circle cx="980" cy="138" r="40" fill="{NIGHT}"/>'
      + dunes(620, "#4A3F5E", 12) + tent(380, 720, 1.1) + fire(700, 740) + dunes(780, "#2D2945", 13, 30))
scene("sunrise", "Illustration: sunrise over desert mountains",
      defs(grad("s", [(0, "#F7B48E"), (1, IVORY)])) + f'<rect width="{W}" height="{H}" fill="url(#s)"/>' + sun(600, 520, 110, "#F28A55")
      + mountains(560, "#B9786C", 14) + mountains(650, "#8E5A5E", 15) + dunes(720, SAND2, 16, 30) + camel(300, 760, 0.6))
scene("tent", "Illustration: a Bedouin tent with tea",
      defs(grad("s", [(0, "#FCE3CF"), (1, IVORY)])) + f'<rect width="{W}" height="{H}" fill="url(#s)"/>' + sun(980, 200, 60)
      + dunes(600, SAND2, 17) + tent(600, 690, 1.8)
      + f'<rect x="760" y="700" width="160" height="16" rx="8" fill="{INK}"/><path d="M800 700 Q800 650 830 650 L850 650 Q880 650 880 700 Z" fill="{BLUE}"/><path d="M880 668 L915 655" stroke="{BLUE}" stroke-width="8"/>'
      + dunes(780, SAND, 18, 30))
scene("oldtown", "Illustration: old town rooftops and a minaret",
      defs(grad("s", [(0, "#BFD3FF"), (1, IVORY)])) + f'<rect width="{W}" height="{H}" fill="url(#s)"/>' + sun(240, 180, 60)
      + f'<rect x="760" y="230" width="70" height="420" fill="{IVORY}"/><path d="M740 230 L850 230 L795 150 Z" fill="{APRICOT}"/><rect x="745" y="330" width="100" height="20" fill="{SAND2}"/>'
      + "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{H-y}" fill="{c}"/><rect x="{x+20}" y="{y+40}" width="30" height="44" rx="15" fill="{INK}" opacity="0.5"/>'
                for x, y, w, c in ((40, 520, 230, SAND), (250, 460, 200, SAND2), (430, 540, 220, "#F3E3CF"), (620, 500, 160, SAND), (860, 470, 180, SAND2), (1020, 540, 180, "#F3E3CF")))
      + "".join(f'<path d="M{x} 700 L{x+120} 700 L{x+100} 760 L{x+20} 760 Z" fill="{c}"/>' for x, c in ((120, APRICOT), (420, BLUE), (760, APRICOT))))
scene("market", "Illustration: market stalls with spices and lanterns",
      f'<rect width="{W}" height="{H}" fill="{IVORY}"/>'
      + "".join(f'<path d="M{x} 260 L{x+300} 260 L{x+280} 340 L{x+20} 340 Z" fill="{c}"/><rect x="{x+20}" y="340" width="260" height="380" fill="#F3E3CF"/>'
                for x, c in ((60, APRICOT), (450, BLUE), (840, APRICOT)))
      + "".join(f'<path d="M{x} 640 Q{x+40} 560 {x+80} 640 Z" fill="{c}"/>' for x, c in ((110, "#C8553D"), (200, "#E3A04A"), (500, "#7C9A3E"), (600, "#C8553D"), (890, "#E3A04A"), (990, "#7C9A3E")))
      + "".join(f'<g transform="translate({x} 120)"><path d="M0 0 L0 60" stroke="{INK}" stroke-width="4"/><path d="M-26 60 L26 60 L18 120 L-18 120 Z" fill="{c}"/></g>' for x, c in ((300, APRICOT), (600, "#FFD27A"), (900, APRICOT)))
      + f'<rect y="720" width="{W}" height="180" fill="{SAND2}"/>')
scene("temple", "Illustration: ancient temple columns",
      defs(grad("s", [(0, "#FCE3CF"), (1, IVORY)])) + f'<rect width="{W}" height="{H}" fill="url(#s)"/>' + sun(980, 170, 70)
      + "".join(f'<rect x="{x}" y="250" width="90" height="470" fill="{SAND2}"/><rect x="{x-14}" y="230" width="118" height="30" fill="#E0A877"/>'
                f'<path d="M{x+20} 300 L{x+20} 690 M{x+45} 300 L{x+45} 690 M{x+70} 300 L{x+70} 690" stroke="#E0A877" stroke-width="4"/>'
                for x in (180, 380, 580, 780))
      + f'<rect x="150" y="200" width="760" height="40" fill="#E0A877"/>' + f'<rect y="720" width="{W}" height="180" fill="{SAND}"/>')
scene("nile", "Illustration: a felucca on the river",
      defs(grad("s", [(0, "#BFD3FF"), (1, IVORY)])) + f'<rect width="{W}" height="{H}" fill="url(#s)"/>' + sun(220, 180, 60)
      + f'<path d="M0 470 Q300 430 600 470 T1200 460 L1200 520 L0 520 Z" fill="#7C9A3E"/>' + palm(160, 480, 0.6) + palm(1000, 470, 0.7)
      + waves(520, "#5B8BF0", 8) + sailboat(640, 600, 0.9) + waves(640, SEA2, 12, 200))
scene("marina", "Illustration: a marina with boats",
      defs(grad("s", [(0, "#BFD3FF"), (1, IVORY)])) + f'<rect width="{W}" height="{H}" fill="url(#s)"/>'
      + "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{480-y}" fill="{c}"/>' for x, y, w, c in ((0, 300, 200, "#F3E3CF"), (180, 250, 160, SAND), (900, 280, 300, "#F3E3CF"), (1080, 220, 120, SAND2)))
      + waves(480, SEA1, 8) + "".join(f'<rect x="{x}" y="220" width="6" height="260" fill="{INK}"/>' for x in (380, 520, 690, 830))
      + boat(450, 520, 0.6) + boat(780, 530, 0.7, IVORY, APRICOT) + waves(600, SEA2, 12, 200) + waves(720, SEA3, 14, 240))
print("ok")
