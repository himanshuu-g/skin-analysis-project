"""recommender/products.py - Product recommendations database"""

PRODUCT_RECOMMENDATIONS = {
    'dry': {
        'description': 'Your skin lacks moisture and may feel tight, rough, or flaky. Focus on hydration and barrier repair.',
        'characteristics': [
            'Tight or rough texture',
            'Visible flaking or scaling',
            'Dull appearance',
            'More prone to fine lines',
            'May feel itchy or irritated'
        ],
        'dos': [
            'Use gentle, creamy cleansers',
            'Apply rich moisturizers twice daily',
            'Use hydrating serums with hyaluronic acid',
            'Apply face oils or balms at night',
            'Use a humidifier in dry environments',
            'Drink plenty of water (8+ glasses daily)',
            'Use lukewarm water, not hot',
            'Apply moisturizer on damp skin'
        ],
        'donts': [
            "Don't use harsh soaps or foaming cleansers",
            "Don't over-exfoliate (max 1-2x per week)",
            "Don't use alcohol-based products",
            "Don't take long, hot showers",
            "Don't skip moisturizer, even in summer"
        ],
        'products': [
            {
                'category': 'Cleanser',
                'name': 'CeraVe Hydrating Facial Cleanser',
                'price': '$15',
                'why': 'Gentle, non-foaming formula with ceramides that cleanse without stripping moisture',
                'alternative': 'La Roche-Posay Toleriane Hydrating Gentle Cleanser'
            },
            {
                'category': 'Serum',
                'name': 'The Ordinary Hyaluronic Acid 2% + B5',
                'price': '$8',
                'why': 'Attracts and retains moisture in the skin with multiple weights of hyaluronic acid',
                'alternative': 'Neutrogena Hydro Boost Hydrating Serum'
            },
            {
                'category': 'Moisturizer (Day)',
                'name': 'Neutrogena Hydro Boost Gel-Cream',
                'price': '$18',
                'why': 'Hyaluronic acid-based formula that provides long-lasting hydration without heaviness',
                'alternative': 'First Aid Beauty Ultra Repair Cream'
            },
            {
                'category': 'Moisturizer (Night)',
                'name': 'CeraVe Moisturizing Cream',
                'price': '$19',
                'why': 'Rich, intensive formula with ceramides and MVE technology for all-night hydration',
                'alternative': 'Vanicream Moisturizing Cream'
            },
            {
                'category': 'Face Oil',
                'name': 'The Ordinary 100% Plant-Derived Squalane',
                'price': '$8',
                'why': 'Lightweight oil that locks in moisture and strengthens skin barrier',
                'alternative': 'Rosehip Seed Oil'
            },
            {
                'category': 'Sunscreen',
                'name': 'La Roche-Posay Anthelios Melt-in Milk SPF 60',
                'price': '$36',
                'why': 'Hydrating sunscreen that won\'t dry out sensitive, dry skin',
                'alternative': 'CeraVe Moisturizing Cream with SPF 30'
            },
            {
                'category': 'Mask',
                'name': 'Laneige Water Sleeping Mask',
                'price': '$32',
                'why': 'Overnight mask that intensely hydrates and plumps skin while you sleep',
                'alternative': 'Origins Drink Up Intensive Overnight Mask'
            }
        ],
        'routine': {
            'morning': [
                '1. Rinse face with lukewarm water (no cleanser)',
                '2. Apply hyaluronic acid serum on damp skin',
                '3. Apply moisturizer while skin is still damp',
                '4. Apply sunscreen SPF 30+'
            ],
            'evening': [
                '1. Remove makeup with micellar water or oil cleanser',
                '2. Cleanse with gentle, hydrating cleanser',
                '3. Apply hyaluronic acid serum on damp skin',
                '4. Apply rich night cream or sleeping mask',
                '5. Add face oil on top if extra dry'
            ]
        }
    },
    
    'oily': {
        'description': 'Your skin produces excess sebum, leading to shine, enlarged pores, and potential breakouts. Focus on balancing oil production without over-drying.',
        'characteristics': [
            'Shiny, greasy appearance',
            'Enlarged, visible pores',
            'Prone to blackheads and acne',
            'Makeup slides off easily',
            'Thick, rough texture'
        ],
        'dos': [
            'Cleanse twice daily with gentle foaming cleanser',
            'Use oil-free, non-comedogenic products',
            'Use clay masks 1-2 times per week',
            'Apply lightweight, gel-based moisturizers',
            'Use salicylic acid or niacinamide serums',
            'Keep blotting papers handy',
            'Always remove makeup before bed',
            'Change pillowcases frequently'
        ],
        'donts': [
            "Don't skip moisturizer (causes more oil production)",
            "Don't over-cleanse (more than 2x daily)",
            "Don't use heavy, thick creams",
            "Don't touch your face frequently",
            "Don't use harsh, stripping products"
        ],
        'products': [
            {
                'category': 'Cleanser',
                'name': 'CeraVe Foaming Facial Cleanser',
                'price': '$15',
                'why': 'Removes excess oil without disrupting skin barrier, contains ceramides and niacinamide',
                'alternative': 'La Roche-Posay Effaclar Purifying Foaming Gel'
            },
            {
                'category': 'Toner',
                'name': 'Paula\'s Choice 2% BHA Liquid Exfoliant',
                'price': '$32',
                'why': 'Salicylic acid unclogs pores, reduces blackheads, and controls oil production',
                'alternative': 'The Ordinary Salicylic Acid 2% Solution'
            },
            {
                'category': 'Serum',
                'name': 'The Ordinary Niacinamide 10% + Zinc 1%',
                'price': '$6',
                'why': 'Regulates sebum production, minimizes pores, and reduces blemishes',
                'alternative': 'Paula\'s Choice 10% Niacinamide Booster'
            },
            {
                'category': 'Moisturizer',
                'name': 'Neutrogena Hydro Boost Water Gel',
                'price': '$18',
                'why': 'Oil-free, lightweight gel that hydrates without adding shine or clogging pores',
                'alternative': 'Clinique Dramatically Different Hydrating Jelly'
            },
            {
                'category': 'Sunscreen',
                'name': 'La Roche-Posay Anthelios Clear Skin SPF 60',
                'price': '$20',
                'why': 'Oil-free, mattifying sunscreen designed specifically for oily, acne-prone skin',
                'alternative': 'EltaMD UV Clear Broad-Spectrum SPF 46'
            },
            {
                'category': 'Mask',
                'name': 'Aztec Secret Indian Healing Clay',
                'price': '$10',
                'why': 'Absorbs excess oil, unclogs pores, and deep cleanses without harsh chemicals',
                'alternative': 'Origins Clear Improvement Active Charcoal Mask'
            },
            {
                'category': 'Spot Treatment',
                'name': 'Mario Badescu Drying Lotion',
                'price': '$17',
                'why': 'Overnight spot treatment that dries up blemishes quickly',
                'alternative': 'Kate Somerville EradiKate Acne Treatment'
            }
        ],
        'routine': {
            'morning': [
                '1. Cleanse with foaming cleanser',
                '2. Apply BHA toner (3-4x per week)',
                '3. Apply niacinamide serum',
                '4. Use oil-free gel moisturizer',
                '5. Apply mattifying sunscreen'
            ],
            'evening': [
                '1. Remove makeup with micellar water',
                '2. Cleanse with foaming cleanser',
                '3. Apply BHA toner (if not used in AM)',
                '4. Apply niacinamide serum',
                '5. Use lightweight night gel',
                '6. Spot treat any blemishes'
            ]
        }
    },
    
    'normal': {
        'description': 'Your skin is well-balanced with minimal concerns. Maintain your healthy skin with consistent, preventive care.',
        'characteristics': [
            'Balanced moisture and oil',
            'Small, barely visible pores',
            'Few to no blemishes',
            'Even skin tone',
            'Smooth texture'
        ],
        'dos': [
            'Maintain consistent skincare routine',
            'Always wear sunscreen daily',
            'Exfoliate 1-2 times per week',
            'Stay hydrated',
            'Get adequate sleep (7-9 hours)',
            'Use antioxidant serums',
            'Cleanse morning and night',
            'Listen to your skin\'s needs'
        ],
        'donts': [
            "Don't skip sunscreen",
            "Don't over-complicate your routine",
            "Don't neglect your neck and chest",
            "Don't forget to remove makeup",
            "Don't ignore signs of change"
        ],
        'products': [
            {
                'category': 'Cleanser',
                'name': 'CeraVe Hydrating Facial Cleanser',
                'price': '$15',
                'why': 'Gentle, balanced formula suitable for maintaining healthy skin',
                'alternative': 'Cetaphil Daily Facial Cleanser'
            },
            {
                'category': 'Vitamin C Serum',
                'name': 'Timeless 20% Vitamin C + E Ferulic Acid Serum',
                'price': '$26',
                'why': 'Brightens skin, fights free radicals, and boosts collagen production',
                'alternative': 'TruSkin Vitamin C Serum'
            },
            {
                'category': 'Moisturizer',
                'name': 'CeraVe Daily Moisturizing Lotion',
                'price': '$16',
                'why': 'Lightweight, non-greasy formula with ceramides for barrier support',
                'alternative': 'Neutrogena Hydro Boost Gel-Cream'
            },
            {
                'category': 'Sunscreen',
                'name': 'EltaMD UV Clear Broad-Spectrum SPF 46',
                'price': '$37',
                'why': 'Lightweight, niacinamide-infused SPF that works under makeup',
                'alternative': 'La Roche-Posay Anthelios Light Fluid SPF 60'
            },
            {
                'category': 'Retinol (Anti-Aging)',
                'name': 'CeraVe Resurfacing Retinol Serum',
                'price': '$19',
                'why': 'Gentle retinol that promotes cell turnover and prevents signs of aging',
                'alternative': 'The Ordinary Retinol 0.5% in Squalane'
            },
            {
                'category': 'Exfoliant',
                'name': 'Paula\'s Choice 2% BHA Liquid Exfoliant',
                'price': '$32',
                'why': 'Gently exfoliates to keep pores clear and skin smooth',
                'alternative': 'The Ordinary Lactic Acid 10% + HA'
            },
            {
                'category': 'Eye Cream',
                'name': 'CeraVe Eye Repair Cream',
                'price': '$16',
                'why': 'Targets early signs of aging around delicate eye area',
                'alternative': 'Olay Eyes Ultimate Eye Cream'
            }
        ],
        'routine': {
            'morning': [
                '1. Cleanse with gentle cleanser',
                '2. Apply Vitamin C serum',
                '3. Use lightweight moisturizer',
                '4. Apply broad-spectrum SPF 30+'
            ],
            'evening': [
                '1. Remove makeup',
                '2. Cleanse thoroughly',
                '3. Exfoliate (2-3x per week)',
                '4. Apply retinol serum (3-4x per week)',
                '5. Use night moisturizer',
                '6. Apply eye cream'
            ]
        }
    }
}


def get_recommendations(skin_type):
    """
    Get product recommendations for a specific skin type
    """
    return PRODUCT_RECOMMENDATIONS.get(skin_type, PRODUCT_RECOMMENDATIONS['normal'])