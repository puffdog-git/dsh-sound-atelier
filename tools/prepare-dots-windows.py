"""Make optional FST normalizers lazy; never substitute a fake normalizer."""
from pathlib import Path
import importlib.util
spec = importlib.util.find_spec('dots_tts')
target = Path(spec.origin).parent / 'utils' / 'text.py'
source = target.read_text(encoding='utf-8')
for lang, alias in [('chinese','Zh'),('english','En')]:
    line = f'from tn.{lang}.normalizer import Normalizer as {alias}Normalizer'
    if line in source:
        source = source.replace(line+'\n','')
        source = source.replace(f'    return {alias}Normalizer()',f'    from tn.{lang}.normalizer import Normalizer as {alias}Normalizer\n    return {alias}Normalizer()')
target.write_text(source,encoding='utf-8')
print('dots.tts optional normalizers are lazy; disabled normalization uses original text preprocessing')
