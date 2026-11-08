import { AnalysisResult } from '../types';

export const samplePaperAr: AnalysisResult = {
  fileName: 'Attention_Is_All_You_Need_Vaswani2017.pdf',
  fileSize: '2.1 MB',
  analyzedAt: new Date().toISOString(),
  language: 'ar',
  overview: {
    title: 'Attention Is All You Need (الانتباه هو كل ما تحتاجه)',
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Łukasz Kaiser', 'Illia Polosukhin'],
    year: '2017',
    venue: '31st Conference on Neural Information Processing Systems (NeurIPS 2017)',
    field: 'معالجة اللغات الطبيعية والتعلم العميق (Deep Learning & NLP)',
    summary: 'تقترح هذه الورقة الرائدة معمارية Transformer، وهو أول نموذج تسلسلي يعتمد بالكامل على آليات الانتباه الذاتي (Self-Attention) دون الحاجة لأي شبكات عصبية تكرارية (RNNs) أو التفافية (CNNs). يحقق النموذج كفاءة حاسوبية هائلة وقابلية للتوازي الفائق مع تفوق ملحوظ في مهام الترجمة الآلية الإنجليزية-الألمانية والإنجليزية-الفرنسية.'
  },
  sections: [
    {
      id: 1,
      key: 'overview',
      title: 'نظرة عامة على الورقة',
      points: [
        {
          id: 'p1_1',
          text: 'الورقة تقدم معمارية شبكة عصبية جديدة كلياً تسمى Transformer وتتخلى تماماً عن آليات التكرار (Recurrence) والالتفاف (Convolution).',
          page: 1,
          type: 'explicit',
          quote: 'We propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output.'
        },
        {
          id: 'p1_2',
          text: 'تصميم النموذج يسمح بتسريع التدريب بأضعاف مقارنة بنماذج LSTM السابقة، مع توفير قدرة توازي فائقة عبر وحدات معالجة الرسومات الحديثة.',
          page: 2,
          type: 'explicit',
          quote: 'The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours on eight P100 GPUs.'
        },
        {
          id: 'p1_3',
          text: 'أحدثت هذه الورقة ثورة بنيوية أصبحت فيما بعد الأساس لجميع النماذج اللغوية الضخمة الحديثة مثل BERT و GPT.',
          page: 1,
          type: 'inferred',
          quote: 'The Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution.'
        }
      ]
    },
    {
      id: 2,
      key: 'problem_gap',
      title: 'المشكلة البحثية والفجوة المعرفية',
      points: [
        {
          id: 'p2_1',
          text: 'الطبيعة التسلسلية الصارمة للشبكات التكرارية (RNNs و LSTMs) تمنع التوازي الحسابي خلال التدريب، مما يعيق معالجة السياقات الطويلة.',
          page: 2,
          type: 'explicit',
          quote: 'This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples.'
        },
        {
          id: 'p2_2',
          text: 'صعوبة تعلم الاعتمادات طويلة المدى (Long-range dependencies) بسبب تزايد عدد العمليات المطلوبة لربط الإشارات بين المواضع المتباعدة.',
          page: 2,
          type: 'explicit',
          quote: 'In these models, the number of operations required to relate signals from two arbitrary input or output positions grows in the distance between positions.'
        },
        {
          id: 'p2_3',
          text: 'الفجوة المعرفية تمثلت في غياب معمارية قادرة على تحقيق الربط المباشر بين أي موضعين في النص بتعقيد زمني ثابت O(1) دون التضحية بجودة التمثيل.',
          page: 2,
          type: 'inferred',
          quote: 'In the Transformer this is reduced to a constant number of operations, albeit at the cost of reduced effective resolution due to averaging attention-weighted positions.'
        }
      ]
    },
    {
      id: 3,
      key: 'objectives_questions',
      title: 'الأهداف، الأسئلة البحثية والفرضيات',
      points: [
        {
          id: 'p3_1',
          text: 'الهدف الرئيسي: بناء نموذج توليد متسلسل يعتمد حصرياً على الانتباه الذاتي لحساب التمثيلات دون الاعتماد على RNNs أو Convolutions.',
          page: 1,
          type: 'explicit',
          quote: 'The goal of reducing sequential computation also forms the foundation of the Extended Neural GPU, ByteNet and ConvS2S... Our goal is to rely entirely on an attention mechanism.'
        },
        {
          id: 'p3_2',
          text: 'الفرضية البحثية: آلية الانتباه متعدد الرؤوس (Multi-Head Attention) كافية بمفردها لتعلم العلاقات النحوية والدلالية بكفاءة تفوق آليات التكرار التقليدية.',
          page: 4,
          type: 'inferred',
          quote: 'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.'
        },
        {
          id: 'p3_3',
          text: 'سؤال البحث: هل يمكن لنموذج غير متسلسل الحفاظ على معلومات الترتيب المكاني والزمني للكلمات عبر التشفير الموضعي (Positional Encoding)؟',
          page: 5,
          type: 'inferred',
          quote: 'Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens.'
        }
      ]
    },
    {
      id: 4,
      key: 'contributions',
      title: 'المساهمات العلمية الرئيسية',
      points: [
        {
          id: 'p4_1',
          text: 'ابتكار معمارية Transformer المكونة من المشفر (Encoder) وفك التشفير (Decoder) المعتمدة على طبقات الانتباه الذاتي المتراكمة.',
          page: 3,
          type: 'explicit',
          quote: 'The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder.'
        },
        {
          id: 'p4_2',
          text: 'تقديم تقنية الانتباه الحسابي المقاس (Scaled Dot-Product Attention) والانتباه متعدد الرؤوس (Multi-Head Attention).',
          page: 4,
          type: 'explicit',
          quote: 'We compute the attention function on a set of queries simultaneously, packed together into a matrix Q... We find it beneficial to linearly project the queries, keys and values h times.'
        },
        {
          id: 'p4_3',
          text: 'ابتكار التشفير الموضعي المعتمد على الدوال المثلثية (Sinusoidal Positional Encoding) لحقن معلومات الترتيب.',
          page: 5,
          type: 'explicit',
          quote: 'We use sine and cosine functions of different frequencies: PE(pos, 2i) = sin(pos/10000^(2i/d_model)).'
        },
        {
          id: 'p4_4',
          text: 'تحقيق أرقام قياسية جديدة (SOTA) في ترجمة WMT 2014 بجهد تدريب حاسوبي أقل بكثير من جميع النماذج المنافسة.',
          page: 8,
          type: 'explicit',
          quote: 'On the WMT 2014 English-to-German translation task, the big transformer model establishes a new state-of-the-art BLEU score of 28.4.'
        }
      ]
    },
    {
      id: 5,
      key: 'methodology',
      title: 'المنهجية العلمية',
      points: [
        {
          id: 'p5_1',
          text: 'المشفر يتألف من كومة مكونة من 6 طبقات متطابقة (N=6)، كل طبقة تحتوي على طبقتين فرعيتين: انتباه متعدد الرؤوس وشبكة تغذية أمامية موضعية.',
          page: 3,
          type: 'explicit',
          quote: 'The encoder is composed of a stack of N = 6 identical layers. Each layer has two sub-layers. The first is a multi-head self-attention mechanism, and the second is a simple, position-wise fully connected feed-forward network.'
        },
        {
          id: 'p5_2',
          text: 'تطبيق الاتصالات المتبقية (Residual Connections) متبوعة بتطبيع الطبقة (Layer Normalization) حول كل طبقة فرعية: LayerNorm(x + Sublayer(x)).',
          page: 3,
          type: 'explicit',
          quote: 'We employ a residual connection around each of the two sub-layers, followed by layer normalization. That is, the output of each sub-layer is LayerNorm(x + Sublayer(x)).'
        },
        {
          id: 'p5_3',
          text: 'استخدام القناع (Masking) في فك التشفير لمنع المواضع من الانتباه إلى المواضع اللاحقة لضمان الخاصية التوليدية الذاتية.',
          page: 3,
          type: 'explicit',
          quote: 'We also modify the self-attention sub-layer in the decoder stack to prevent positions from attending to subsequent positions. This masking ensures predictions for position i can depend only on known outputs.'
        },
        {
          id: 'p5_4',
          text: 'استخدام عامل قياس 1/sqrt(d_k) لتفادي دخول دالة softmax في مناطق ذات تدرجات حسابية متناهية الصغر مع القيم الكبيرة.',
          page: 4,
          type: 'inferred',
          quote: 'We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients.'
        }
      ]
    },
    {
      id: 6,
      key: 'data_tools_models',
      title: 'البيانات، الأدوات، والنماذج',
      points: [
        {
          id: 'p6_1',
          text: 'مجموعة بيانات الترجمة الإنجليزية-الألمانية WMT 2014 تحتوي على 4.5 مليون زوج جمل مشفرة بترميز BPE بـ 37,000 رمز.',
          page: 7,
          type: 'explicit',
          quote: 'On the WMT 2014 English-German dataset consisting of about 4.5 million sentence pairs... encoded using byte-pair encoding, which has a shared source-target vocabulary of about 37000 tokens.'
        },
        {
          id: 'p6_2',
          text: 'مجموعة بيانات الترجمة الإنجليزية-الفرنسية WMT 2014 تحتوي على 36 مليون زوج جمل بترميز wordpiece يضم 32,000 رمز.',
          page: 7,
          type: 'explicit',
          quote: 'For English-French, we used the significantly larger WMT 2014 English-French dataset consisting of 36M sentences and split tokens into a 32000 word-piece vocabulary.'
        },
        {
          id: 'p6_3',
          text: 'بيئة التدريب: تم التدريب على جهاز خادم مزود بـ 8 بطاقات NVIDIA Tesla P100 GPUs.',
          page: 7,
          type: 'explicit',
          quote: 'We trained our models on one machine with 8 NVIDIA P100 GPUs.'
        },
        {
          id: 'p6_4',
          text: 'مُحسِّن Adam مع معدل تعلم ديناميكي (Warmup steps = 4000) وتقنية تخفيف التسميات (Label Smoothing = 0.1).',
          page: 7,
          type: 'explicit',
          quote: 'We used the Adam optimizer with beta_1 = 0.9, beta_2 = 0.98 and epsilon = 10^-9... During training, we employed label smoothing of value epsilon_ls = 0.1.'
        }
      ]
    },
    {
      id: 7,
      key: 'results_discussion',
      title: 'النتائج والمناقشة',
      points: [
        {
          id: 'p7_1',
          text: 'حقق النموذج الكبير (Transformer Big) درجة BLEU بلغت 28.4 في مهمة WMT 2014 الإنجليزية-الألمانية، متفوقاً بأكثر من 2.0 نقطة BLEU على أفضل الأنظمة السابقة.',
          page: 8,
          type: 'explicit',
          quote: 'On the WMT 2014 English-to-German translation task, the big transformer model establishes a new state-of-the-art BLEU score of 28.4, improving over the existing best results by more than 2.0 BLEU.'
        },
        {
          id: 'p7_2',
          text: 'في مهمة الإنجليزية-الفرنسية، حقق درجة 41.0 BLEU بتكلفة تدريب تعادل 1/4 تكلفة النماذج الرائدة المنافسة.',
          page: 8,
          type: 'explicit',
          quote: 'On the WMT 2014 English-to-French translation task, our big model achieves a BLEU score of 41.0, outperforming all previously published single models, at less than 1/4 the training cost.'
        },
        {
          id: 'p7_3',
          text: 'دراسة الاستئصال (Ablation Study): أظهرت النتائج أن نموذج الرأس الواحد (Single-head attention) أسوأ بنسبة 0.9 BLEU من النموذج متعدد الرؤوس (8 رؤوس).',
          page: 9,
          type: 'explicit',
          quote: 'In Table 3 rows (A), we vary the number of attention heads and the attention key and value dimensions... while single-head attention is 0.9 BLEU worse than the best setting.'
        },
        {
          id: 'p7_4',
          text: 'أثبتت النتائج نجاح النموذج أيضاً في مهمة التحليل الإعرابي للنصوص الإنجليزية (English Constituency Parsing) محققاً 91.3 في مقياس F1.',
          page: 9,
          type: 'explicit',
          quote: 'To evaluate if the Transformer can generalize to other tasks we performed experiments on English constituency parsing... our model performs surprisingly well with 91.3 F1.'
        }
      ]
    },
    {
      id: 8,
      key: 'limitations',
      title: 'محددات وقصور البحث',
      points: [
        {
          id: 'p8_1',
          text: 'التعقيد الحسابي لمصفوفة الانتباه هو تعقيد تربيعي O(n^2) بالنسبة لطول المتسلسلة، مما يجعل معالجة المستندات فائقة الطول مكلفة للغاية من حيث الذاكرة.',
          page: 6,
          type: 'explicit',
          quote: 'Self-attention layers connect all positions with a constant number of sequentially executed operations... with computational complexity per layer O(n^2 * d).'
        },
        {
          id: 'p8_2',
          text: 'الاعتماد على استهلاك ذاكرة كبير في وحدات معالجة الرسومات أثناء مرحلة الاستدلال (Inference) التوليدي كلمة بكلمة مقارنة بسرعة التدريب.',
          page: 6,
          type: 'inferred',
          quote: 'To improve computational performance for tasks involving very long sequences, self-attention could be restricted to considering only a neighborhood of size r in the input sequence.'
        },
        {
          id: 'p8_3',
          text: 'اقتصرت التجارب الأولية بشكل أساسي على الترجمة الآلية ومهمة إعراب نصي واحدة، دون تقييم مباشر على وسائط أخرى مثل الصور أو الصوت في هذه النسخة.',
          page: 10,
          type: 'explicit',
          quote: 'We plan to extend the Transformer to problems involving input and output modalities other than text, such as images, audio and video.'
        }
      ]
    },
    {
      id: 9,
      key: 'critical_evaluation',
      title: 'التقييم النقدي (نقاط القوة والضعف)',
      points: [
        {
          id: 'p9_1',
          category: 'strength',
          text: 'إنجاز معماري ثوري يفكك الارتباط الوثيق بالحسابات التسلسلية ويتيح التوازي الكامل على العتاد الحديث.',
          page: 2,
          type: 'inferred',
          quote: 'The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours.'
        },
        {
          id: 'p9_2',
          category: 'strength',
          text: 'دراسات استئصال (Ablations) شاملة جداً وثّقت أثر أبعاد الرؤوس، حجم الفلتر، وإسقاط التضمين والتنعيم على الأداء.',
          page: 9,
          type: 'explicit',
          quote: 'We evaluated the importance of different components of the Transformer, measuring changes in performance on English-to-German translation on the development set, newstest2013.'
        },
        {
          id: 'p9_3',
          category: 'strength',
          text: 'تكلفة تدريب منخفضة نسبياً (3.3 * 10^18 FLOPs للنموذج الأساسي) مع نتائج تفوقت على نماذج تطلبت 10 أضعاف القوة الحسابية.',
          page: 8,
          type: 'explicit',
          quote: 'Training Cost (FLOPs): Base model 3.3e18 compared to ByteNet 1.0e20 and ConvS2S 9.6e18.'
        },
        {
          id: 'p9_4',
          category: 'weakness',
          text: 'الافتقار إلى معالجة صريحة للتعقيد التربيعي للذاكرة O(n^2)، واكتفى المؤلفون بالإشارة إلى تقييد الانتباه للجوار المحلي دون اختباره.',
          page: 6,
          type: 'inferred',
          quote: 'This could be restricted to considering only a neighborhood of size r in the input sequence centered around the respective output position. We plan to investigate this further.'
        },
        {
          id: 'p9_5',
          category: 'weakness',
          text: 'ضعف أداء النموذج في حالة التدريب على مجموعات بيانات صغيرة جداً دون ضبط مسبق أو تنظيم شديد، نظراً لغياب التحيز الاستقرائي (Inductive Bias) المتوفر في CNNs.',
          page: 7,
          type: 'inferred',
          quote: 'During training, we employed label smoothing of value epsilon_ls = 0.1. This hurts perplexity, as the model learns to be more unsure, but improves accuracy and BLEU score.'
        }
      ]
    },
    {
      id: 10,
      key: 'future_directions',
      title: 'آفاق وتوجهات البحث المستقبلي',
      points: [
        {
          id: 'p10_1',
          text: 'توسيع معمارية Transformer لتشمل وسائط متعددة كإدخال وإخراج مثل الصور والصوت والفيديو.',
          page: 10,
          type: 'explicit',
          quote: 'We plan to extend the Transformer to problems involving input and output modalities other than text, such as images, audio and video.'
        },
        {
          id: 'p10_2',
          text: 'تطوير آليات انتباه محلي ومجزأ لمعالجة المدخلات والمخرجات فائقة الطول كالكتب والمستندات الكاملة.',
          page: 10,
          type: 'explicit',
          quote: 'Investigating local, restricted attention mechanisms to efficiently handle large inputs and outputs such as images, audio and video.'
        },
        {
          id: 'p10_3',
          text: 'توليد المخرجات بطرق أقل تسلسلاً وغير تلقائية (Non-autoregressive generation) لتسريع زمن الاستدلال بشكل كبير.',
          page: 10,
          type: 'explicit',
          quote: 'Making generation less sequential is another research goal of ours.'
        }
      ]
    }
  ]
};

export const samplePaperEn: AnalysisResult = {
  fileName: 'Attention_Is_All_You_Need_Vaswani2017.pdf',
  fileSize: '2.1 MB',
  analyzedAt: new Date().toISOString(),
  language: 'en',
  overview: {
    title: 'Attention Is All You Need',
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Łukasz Kaiser', 'Illia Polosukhin'],
    year: '2017',
    venue: '31st Conference on Neural Information Processing Systems (NeurIPS 2017)',
    field: 'Natural Language Processing & Deep Learning',
    summary: 'This seminal paper introduces the Transformer architecture, the first sequence transduction model based entirely on self-attention mechanisms without recurrence or convolutions. It achieves unprecedented training parallelization and state-of-the-art translation quality on WMT 2014 English-German (28.4 BLEU) and English-French (41.0 BLEU).'
  },
  sections: [
    {
      id: 1,
      key: 'overview',
      title: 'Paper Overview',
      points: [
        {
          id: 'p1_1_en',
          text: 'The paper proposes the Transformer, a novel sequence architecture relying entirely on self-attention mechanisms, dispensing with recurrence and convolutions entirely.',
          page: 1,
          type: 'explicit',
          quote: 'We propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output.'
        },
        {
          id: 'p1_2_en',
          text: 'The model achieves superior parallelization during training, reaching state-of-the-art results on 8 P100 GPUs in as little as 12 hours.',
          page: 2,
          type: 'explicit',
          quote: 'The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours on eight P100 GPUs.'
        },
        {
          id: 'p1_3_en',
          text: 'The architecture established the foundational paradigm shift that underpins modern Large Language Models (BERT, GPT, T5, LLaMA).',
          page: 1,
          type: 'inferred',
          quote: 'The Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution.'
        }
      ]
    },
    {
      id: 2,
      key: 'problem_gap',
      title: 'Research Problem & Gap',
      points: [
        {
          id: 'p2_1_en',
          text: 'Inherent sequential execution in RNNs (LSTM, GRU) creates an architectural bottleneck that prohibits parallel training over sequence tokens.',
          page: 2,
          type: 'explicit',
          quote: 'This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples.'
        },
        {
          id: 'p2_2_en',
          text: 'Relating distant positions in previous recurrent and convolutional architectures required O(n) or O(log n) operations, impeding long-range dependency capture.',
          page: 2,
          type: 'explicit',
          quote: 'In these models, the number of operations required to relate signals from two arbitrary input or output positions grows in the distance between positions.'
        },
        {
          id: 'p2_3_en',
          text: 'The key research gap was the absence of a transduction model that could establish direct connections between arbitrary positions in constant O(1) operations without sequential memory overhead.',
          page: 2,
          type: 'inferred',
          quote: 'In the Transformer this is reduced to a constant number of operations, albeit at the cost of reduced effective resolution due to averaging attention-weighted positions.'
        }
      ]
    },
    {
      id: 3,
      key: 'objectives_questions',
      title: 'Objectives, Research Questions & Hypotheses',
      points: [
        {
          id: 'p3_1_en',
          text: 'Primary Objective: Develop an encoder-decoder sequence model that eliminates recurrence while attaining superior translation benchmarks.',
          page: 1,
          type: 'explicit',
          quote: 'Our goal is to rely entirely on an attention mechanism to draw global dependencies between input and output.'
        },
        {
          id: 'p3_2_en',
          text: 'Core Hypothesis: Multi-head attention across projected subspaces provides sufficient representational power to encode syntax and semantics without recurrent hidden states.',
          page: 4,
          type: 'inferred',
          quote: 'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.'
        },
        {
          id: 'p3_3_en',
          text: 'Research Question: How can a non-recurrent network preserve positional order and sequential geometry without spatial convolutional filters?',
          page: 5,
          type: 'inferred',
          quote: 'Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens.'
        }
      ]
    },
    {
      id: 4,
      key: 'contributions',
      title: 'Main Contributions',
      points: [
        {
          id: 'p4_1_en',
          text: 'Introduction of the full Transformer Encoder-Decoder architecture based purely on stacked self-attention layers.',
          page: 3,
          type: 'explicit',
          quote: 'The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder.'
        },
        {
          id: 'p4_2_en',
          text: 'Formulation of Scaled Dot-Product Attention with a 1/sqrt(d_k) factor and Multi-Head Attention spanning h=8 subspaces.',
          page: 4,
          type: 'explicit',
          quote: 'We compute the attention function on a set of queries simultaneously, packed together into a matrix Q... We find it beneficial to linearly project the queries, keys and values h times.'
        },
        {
          id: 'p4_3_en',
          text: 'Design of sinusoidal positional encodings allowing the model to extrapolate to sequence lengths longer than those observed during training.',
          page: 6,
          type: 'explicit',
          quote: 'We also experimented with using learned positional embeddings instead, and found that the two versions produced nearly identical results... We chose the sinusoidal version because it may allow the model to extrapolate to sequence lengths longer than those encountered during training.'
        },
        {
          id: 'p4_4_en',
          text: 'Setting new SOTA on WMT 2014 English-German (28.4 BLEU) and English-French (41.0 BLEU) with orders-of-magnitude lower training cost.',
          page: 8,
          type: 'explicit',
          quote: 'On the WMT 2014 English-to-German translation task, the big transformer model establishes a new state-of-the-art BLEU score of 28.4.'
        }
      ]
    },
    {
      id: 5,
      key: 'methodology',
      title: 'Methodology',
      points: [
        {
          id: 'p5_1_en',
          text: 'Stacked encoder of N=6 identical layers, each with multi-head self-attention and a two-layer feedforward network with ReLU activation.',
          page: 3,
          type: 'explicit',
          quote: 'The encoder is composed of a stack of N = 6 identical layers. Each layer has two sub-layers: a multi-head self-attention mechanism, and a simple, position-wise fully connected feed-forward network.'
        },
        {
          id: 'p5_2_en',
          text: 'Residual connections wrapped around each sub-layer followed by Layer Normalization: LayerNorm(x + Sublayer(x)).',
          page: 3,
          type: 'explicit',
          quote: 'We employ a residual connection around each of the two sub-layers, followed by layer normalization. That is, the output of each sub-layer is LayerNorm(x + Sublayer(x)).'
        },
        {
          id: 'p5_3_en',
          text: 'Masked self-attention in the decoder to prevent leftward information flow and maintain the autoregressive property.',
          page: 3,
          type: 'explicit',
          quote: 'This masking, combined with fact that the output embeddings are offset by one position, ensures that the predictions for position i can depend only on the known outputs at positions less than i.'
        },
        {
          id: 'p5_4_en',
          text: 'Scaling dot-products by 1/sqrt(d_k) to counteract vanishing gradients in the softmax function caused by large vector dimensions.',
          page: 4,
          type: 'inferred',
          quote: 'We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients.'
        }
      ]
    },
    {
      id: 6,
      key: 'data_tools_models',
      title: 'Data, Tools & Models',
      points: [
        {
          id: 'p6_1_en',
          text: 'WMT 2014 English-German dataset: 4.5 million sentence pairs segmented with Byte-Pair Encoding (BPE) into 37,000 shared tokens.',
          page: 7,
          type: 'explicit',
          quote: 'On the WMT 2014 English-German dataset consisting of about 4.5 million sentence pairs... encoded using byte-pair encoding, which has a shared source-target vocabulary of about 37000 tokens.'
        },
        {
          id: 'p6_2_en',
          text: 'WMT 2014 English-French dataset: 36 million sentence pairs segmented into a 32,000 word-piece vocabulary.',
          page: 7,
          type: 'explicit',
          quote: 'For English-French, we used the significantly larger WMT 2014 English-French dataset consisting of 36M sentences and split tokens into a 32000 word-piece vocabulary.'
        },
        {
          id: 'p6_3_en',
          text: 'Hardware configuration: Single node containing 8 NVIDIA Tesla P100 GPUs.',
          page: 7,
          type: 'explicit',
          quote: 'We trained our models on one machine with 8 NVIDIA P100 GPUs.'
        },
        {
          id: 'p6_4_en',
          text: 'Hyperparameters: Adam optimizer (beta1=0.9, beta2=0.98, eps=1e-9), learning rate schedule with 4000 warmup steps, dropout=0.1, label smoothing=0.1.',
          page: 7,
          type: 'explicit',
          quote: 'We used the Adam optimizer with beta_1 = 0.9, beta_2 = 0.98 and epsilon = 10^-9... During training, we employed label smoothing of value epsilon_ls = 0.1.'
        }
      ]
    },
    {
      id: 7,
      key: 'results_discussion',
      title: 'Results & Discussion',
      points: [
        {
          id: 'p7_1_en',
          text: 'The Transformer (big) achieved 28.4 BLEU on English-to-German, outperforming the prior state of the art by over 2.0 BLEU points.',
          page: 8,
          type: 'explicit',
          quote: 'On the WMT 2014 English-to-German translation task, the big transformer model establishes a new state-of-the-art BLEU score of 28.4, improving over the existing best results by more than 2.0 BLEU.'
        },
        {
          id: 'p7_2_en',
          text: 'On English-to-French, the big model attained 41.0 BLEU at less than 1/4th the training cost of previously published single models.',
          page: 8,
          type: 'explicit',
          quote: 'On the WMT 2014 English-to-French translation task, our big model achieves a BLEU score of 41.0, outperforming all previously published single models, at less than 1/4 the training cost.'
        },
        {
          id: 'p7_3_en',
          text: 'Ablation experiments showed that single-head attention underperformed multi-head (8 heads) by 0.9 BLEU, while too many heads (16 or 32) degraded performance.',
          page: 9,
          type: 'explicit',
          quote: 'While single-head attention is 0.9 BLEU worse than the best setting, quality also drops off with too many heads.'
        },
        {
          id: 'p7_4_en',
          text: 'Generalization test: Evaluated on English Constituency Parsing on the Wall Street Journal (WSJ) dataset, scoring 91.3 F1 with no task-specific tuning.',
          page: 9,
          type: 'explicit',
          quote: 'To evaluate if the Transformer can generalize to other tasks we performed experiments on English constituency parsing... our model performs surprisingly well with 91.3 F1.'
        }
      ]
    },
    {
      id: 8,
      key: 'limitations',
      title: 'Limitations',
      points: [
        {
          id: 'p8_1_en',
          text: 'Quadratic computational and memory complexity O(n^2) with respect to input sequence length n in full self-attention layers.',
          page: 6,
          type: 'explicit',
          quote: 'Self-attention layers connect all positions with a constant number of sequentially executed operations... with computational complexity per layer O(n^2 * d).'
        },
        {
          id: 'p8_2_en',
          text: 'Inference step-by-step autoregressive generation remains strictly sequential, retaining latency bottlenecks at test time despite fast parallel training.',
          page: 10,
          type: 'inferred',
          quote: 'Making generation less sequential is another research goal of ours.'
        },
        {
          id: 'p8_3_en',
          text: 'Evaluation was restricted to two language pairs and one syntactic parsing task, with multimodal capabilities left entirely to future work.',
          page: 10,
          type: 'explicit',
          quote: 'We plan to extend the Transformer to problems involving input and output modalities other than text, such as images, audio and video.'
        }
      ]
    },
    {
      id: 9,
      key: 'critical_evaluation',
      title: 'Critical Evaluation (Strengths & Weaknesses)',
      points: [
        {
          id: 'p9_1_en',
          category: 'strength',
          text: 'Groundbreaking paradigm shift demonstrating that attention alone is sufficient for sequence modeling without recurrence.',
          page: 2,
          type: 'inferred',
          quote: 'The Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution.'
        },
        {
          id: 'p9_2_en',
          category: 'strength',
          text: 'Exceptional computational efficiency, training the big model in 3.5 days on 8 P100s compared to weeks for deep recurrent models.',
          page: 8,
          type: 'explicit',
          quote: 'Training Cost (FLOPs): Base model 3.3e18 compared to ByteNet 1.0e20 and ConvS2S 9.6e18.'
        },
        {
          id: 'p9_3_en',
          category: 'strength',
          text: 'Meticulous ablation studies isolating the exact contribution of attention heads, key dimensions, and dropout rates.',
          page: 9,
          type: 'explicit',
          quote: 'We evaluated the importance of different components of the Transformer, measuring changes in performance on English-to-German translation on the development set.'
        },
        {
          id: 'p9_4_en',
          category: 'weakness',
          text: 'Absence of an empirical solution for the O(n^2) sequence length bottleneck, deferring local attention mechanisms to future investigation.',
          page: 6,
          type: 'inferred',
          quote: 'To improve computational performance for tasks involving very long sequences, self-attention could be restricted to considering only a neighborhood of size r. We plan to investigate this further.'
        },
        {
          id: 'p9_5_en',
          category: 'weakness',
          text: 'High sensitivity to warmup learning rates and regularization; lacking the spatial translation invariance (inductive bias) native to CNNs without massive training datasets.',
          page: 7,
          type: 'inferred',
          quote: 'This hurts perplexity, as the model learns to be more unsure, but improves accuracy and BLEU score.'
        }
      ]
    },
    {
      id: 10,
      key: 'future_directions',
      title: 'Future Research Directions',
      points: [
        {
          id: 'p10_1_en',
          text: 'Expanding the Transformer architecture to multimodal tasks including computer vision, raw audio synthesis, and video understanding.',
          page: 10,
          type: 'explicit',
          quote: 'We plan to extend the Transformer to problems involving input and output modalities other than text, such as images, audio and video.'
        },
        {
          id: 'p10_2_en',
          text: 'Designing restricted and local attention mechanisms to manage long contexts such as entire books or high-resolution imagery.',
          page: 10,
          type: 'explicit',
          quote: 'Investigating local, restricted attention mechanisms to efficiently handle large inputs and outputs such as images, audio and video.'
        },
        {
          id: 'p10_3_en',
          text: 'Developing non-autoregressive decoding strategies to eliminate sequential token generation latency during inference.',
          page: 10,
          type: 'explicit',
          quote: 'Making generation less sequential is another research goal of ours.'
        }
      ]
    }
  ]
};
