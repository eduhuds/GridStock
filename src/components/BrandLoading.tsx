import s from './BrandLoading.module.css';

export default function BrandLoading({ compact = false, message = 'Preparando seu espaço de trabalho…' }: { compact?: boolean; message?: string }) {
  return <div className={`${s.shell} ${compact ? s.compact : ''}`} role="status" aria-live="polite" aria-busy="true">
    <div className={s.mark}><img src="/gridstock-mark.svg" width="56" height="56" alt="" /></div>
    <strong className={s.brand}>gridstock<span>.</span></strong>
    <p>{message}</p>
    <div className={s.track} aria-hidden="true"><span /></div>
  </div>;
}
