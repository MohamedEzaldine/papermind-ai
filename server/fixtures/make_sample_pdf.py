from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, PageBreak
from reportlab.lib.styles import getSampleStyleSheet
st=getSampleStyleSheet()['BodyText']
pages=[
 ["A semi-supervised approach for electricity theft monitoring.","Non-technical losses, mainly electricity theft, impose a severe economic burden on utilities. Most existing studies rely on supervised models that require labeled data, which is costly to obtain in practice."],
 ["The dataset from the State Grid Corporation of China covers 1035 days and contains 38,757 normal consumers and 3,615 electricity thieves.","The threshold T is set to the 99.7% percentile of the reconstruction error on the training data."],
 ["The LSTM-AE achieved the best performance with an accuracy of 97.31% and an AUC of 0.812, outperforming the Conv-AE and GRU-AE models.","Future work will explore variational autoencoders and multiple adaptive thresholds."],
]
doc=SimpleDocTemplate('server/fixtures/sample-paper.pdf',pagesize=A4)
flow=[]
for i,p in enumerate(pages):
    flow += [Paragraph(x,st) for x in p]
    if i<len(pages)-1: flow.append(PageBreak())
doc.build(flow)
