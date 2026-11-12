import Link from 'next/link';
import { Icon } from '@/components/icons';
import { LegalFooterLinks } from '@/components/LegalAccessibilityHub';
import { LandingHeader, ProductPreview, Reveal, Workflow } from './LandingInteractions';
import { WHATSAPP_URL } from './config';
import s from './landing.module.css';

function Brand() {
  return <span className={s.brand}><img src="/gridstock-mark.svg" width="34" height="34" alt="" />gridstock<span className={s.brandPeriod}>.</span></span>;
}

function ContactLink({ children = 'Quero conhecer o GridStock', light = false }: { children?: React.ReactNode; light?: boolean }) {
  return <a className={`${s.primaryButton} ${light ? s.lightButton : ''}`} href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">{children}<Icon name="arrow" /></a>;
}

function Parcel() {
  return <div className={s.parcelScene} aria-hidden="true">
    <div className={s.parcelShadow} />
    <div className={s.parcel}><div className={s.parcelTop}><i /></div><div className={s.parcelSide} /><div className={s.parcelFront}><span className={s.parcelTape} /><span className={s.parcelEyes}><i /><i /></span><span className={s.parcelSmile} /><span className={s.parcelLabel}>G.</span></div></div>
    <span className={s.parcelSpark}>✦</span>
  </div>;
}

const faqs = [
  ['Para quem é o GridStock?', 'Para empresas que precisam organizar materiais em almoxarifados e acompanhar peças com equipes externas, como operações de instalação, manutenção e assistência técnica. Também há configurações para comércio e estoque geral. Na conversa, entendemos o que faz sentido para a sua operação.'],
  ['Como consigo acesso para a minha empresa?', 'Clique em “Solicitar acesso pelo WhatsApp” e fale com a nossa equipe. O cadastro da empresa e a liberação do primeiro responsável são feitos por nós. Depois, você entra no sistema com CPF e senha.'],
  ['O técnico consegue usar pelo celular?', 'Sim. O portal do técnico é acessado pelo navegador do celular, com conexão à internet. Nele, o profissional consulta os materiais sob sua responsabilidade e registra retiradas, utilizações e devoluções.'],
  ['Consigo controlar mais de um almoxarifado?', 'Sim. Você pode organizar bases, identificar produtos por corredor e prateleira e registrar transferências entre almoxarifados. Os módulos e limites de acesso são definidos na configuração da sua empresa.'],
  ['Como funciona a localização do material utilizado?', 'Ao registrar a utilização, o técnico pode permitir o acesso à localização do dispositivo. As coordenadas ficam vinculadas à movimentação e podem ser consultadas no mapa. Se o GPS não estiver disponível, o local pode ser informado manualmente. Não é rastreamento contínuo do técnico.'],
  ['Quanto custa e como funciona a contratação?', 'Converse com a nossa equipe pelo WhatsApp para conhecer as condições de acesso, os módulos e os limites adequados à sua empresa. A contratação e a liberação do ambiente são feitas com atendimento direto.'],
];

export default function LandingPage() {
  return <div className={s.page} id="inicio">
    <a className={s.skipLink} href="#conteudo">Pular para o conteúdo</a>
    <LandingHeader />
    <main id="conteudo">
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroGrid} aria-hidden="true" />
        <div className={s.heroIntro}>
          <span className={s.eyebrow}><span className={s.liveDot} /> ESTOQUE ORGANIZADO. OPERAÇÃO CONECTADA.</span>
          <h1 id="hero-title">Saiba onde está cada peça.<br /><span>Da base ao campo.</span></h1>
          <p className={s.heroDescription}>O controle de estoque para quem tem equipes em campo.<br className={s.desktopBreak} /> Veja o que está no almoxarifado, com cada técnico e o que foi utilizado.</p>
          <div className={s.heroActions}><ContactLink /><a className={s.secondaryButton} href="#como-funciona"><span className={s.playIcon}>▶</span> Veja como funciona</a></div>
          <p className={s.microcopy}><Icon name="check" /> Fale com a gente no WhatsApp para ter seu acesso.</p>
        </div>
        <div className={s.heroProduct}>
          <div className={s.handNote}>Seu estoque tem história.<br />Agora você acompanha.<span>⤵</span></div>
          <div className={s.heroParcel}><Parcel /></div>
          <div className={s.floatTag}><span><Icon name="check" /></span><div><strong>Cada movimentação conta.</strong><small>Da retirada à devolução.</small></div></div>
          <ProductPreview />
        </div>
        <div className={s.audienceStrip}><span>FEITO PARA QUEM COLOCA A OPERAÇÃO EM MOVIMENTO</span><div><span><Icon name="tool" /> Manutenção</span><span><Icon name="route" /> Instalação</span><span><Icon name="users" /> Assistência técnica</span><span><Icon name="box" /> Almoxarifados</span></div></div>
      </section>

      <section className={`${s.section} ${s.problemSection}`} id="por-que-gridstock">
        <Reveal><div className={s.sectionHeading}><span className={s.eyebrow}>PARECE FAMILIAR?</span><h2>A peça saiu da base.<br />O controle foi junto?</h2><p>Entre a prateleira, o carro e o atendimento, é fácil perder o fio da história. O GridStock conecta essas etapas.</p></div></Reveal>
        <div className={s.problemGrid}>
          {[['box', '“Ainda tem na base?”', 'Consulte o saldo e o endereço de cada item, sem depender de uma ida ao almoxarifado.'], ['users', '“Quem ficou com essa peça?”', 'Veja os materiais sob responsabilidade de cada técnico, mesmo depois da retirada.'], ['pin', '“Onde esse material foi usado?”', 'Consulte a utilização registrada, o responsável e o local informado no atendimento.']].map(([icon, title, text], i) => <Reveal key={title} delay={i * 80}><article className={s.problemCard}><span className={s.iconTile}><Icon name={icon} /></span><h3>{title}</h3><p>{text}</p><span className={s.cardIndex}>0{i + 1}</span></article></Reveal>)}
        </div>
      </section>

      <section className={s.workflowSection} id="como-funciona">
        <div className={s.section}>
          <Reveal><div className={s.sectionHeading}><span className={s.eyebrow}>DA PRATELEIRA AO ATENDIMENTO</span><h2>O caminho da peça.<br /><span>Sem perder o fio.</span></h2><p>Um fluxo conectado para a operação e para quem está na rua.</p></div></Reveal>
          <Reveal><Workflow /></Reveal>
        </div>
      </section>

      <section className={s.section} id="recursos">
        <Reveal><div className={`${s.sectionHeading} ${s.leftHeading}`}><div><span className={s.eyebrow}>MENOS DÚVIDA. MAIS VISIBILIDADE.</span><h2>Cada ponta da operação.<br />No mesmo lugar.</h2></div><p>O detalhe que o técnico registra vira informação para quem cuida do estoque.</p></div></Reveal>
        <div className={s.featureGrid}>
          <Reveal className={s.featureWide}><article className={`${s.featureCard} ${s.stockFeature}`}><div className={s.featureCopy}><span className={s.featureLabel}><Icon name="box" /> ALMOXARIFADOS</span><h3>Um lugar para cada peça.<br />Um saldo para cada base.</h3><p>Organize por corredor e prateleira. Consulte saldos e registre transferências entre suas unidades.</p></div><div className={s.shelfIllustration} aria-hidden="true"><div className={s.shelfTopline}><span>Base central</span><span>A · 03</span></div><div className={s.shelf}><i /><i /><i /><i /><i /><i /></div><div className={s.shelfPill}><Icon name="pin" /> Corredor A <span>→</span> Prateleira 03 <Icon name="check" /></div></div></article></Reveal>
          <Reveal><article className={`${s.featureCard} ${s.alertFeature}`}><span className={s.featureLabel}><Icon name="bell" /> REPOSIÇÃO</span><h3>Olhe para o que<br />precisa de atenção.</h3><p>Identifique os produtos que atingiram o estoque mínimo cadastrado.</p><div className={s.restockCard}><span className={s.warningIcon}><Icon name="alert" /></span><div><strong>Conector óptico</strong><span>Abaixo do mínimo</span></div><strong>8 <small>un.</small></strong></div><div className={s.restockTrack}><i /></div><div className={s.restockLegend}><span>Saldo atual: 8</span><span>Mínimo: 20</span></div><small className={s.exampleLabel}>Exemplo ilustrativo</small></article></Reveal>
          <Reveal><article className={`${s.featureCard} ${s.historyFeature}`}><span className={s.featureLabel}><Icon name="arrows" /> RASTREABILIDADE</span><h3>Uma movimentação.<br />Todos os detalhes.</h3><p>Consulte retiradas, utilizações e devoluções, com responsável e histórico para conferência.</p><div className={s.miniTimeline}>{[['Retirada na base', '08:15', 'box'], ['Utilização registrada', '10:42', 'pin'], ['Devolução de sobras', '17:30', 'reset']].map(([title, time, icon]) => <div key={title}><span><Icon name={icon} /></span><strong>{title}</strong><small>{time}</small></div>)}</div><small className={s.exampleLabel}>Fluxo ilustrativo</small></article></Reveal>
          <Reveal className={s.featureWide}><article className={`${s.featureCard} ${s.mobileFeature}`}><div className={s.featureCopy}><span className={s.featureLabel}><Icon name="van" /> EQUIPE EM CAMPO</span><h3>O estoque do técnico.<br />Na palma da mão.</h3><p>Um portal no navegador do celular para consultar a carga e registrar o uso das peças durante o atendimento.</p><span className={s.inlineCheck}><Icon name="check" /> Acesso individual por CPF e senha</span></div><div className={s.phone}><div className={s.phoneCamera} /><div className={s.phoneTop}><img src="/gridstock-mark.svg" alt="" width="24" height="24" /><span>Portal do técnico</span></div><small>EXEMPLO ILUSTRATIVO</small><h4>Pronto para a rota.</h4><div className={s.phoneStock}><span>Meu estoque</span><strong>24 <small>peças</small></strong><span>3 produtos na sua carga</span></div><div className={s.phoneItem}><Icon name="box" /><div><strong>Conector óptico</strong><small>12 unidades</small></div><Icon name="chevron" /></div><div className={s.phoneAction}><Icon name="check" /> Registrar utilização</div><div className={s.phoneLocation}><Icon name="pin" /> Local vinculado ao registro*</div></div></article></Reveal>
        </div>
        <p className={s.featureFootnote}>* A captura de GPS depende da permissão e da disponibilidade de localização no dispositivo. O local também pode ser informado manualmente.</p>
      </section>

      <section className={`${s.section} ${s.startSection}`} id="comecar">
        <Reveal><div className={s.sectionHeading}><span className={s.eyebrow}>SEU PRÓXIMO PASSO</span><h2>Começa com uma conversa.<br />Continua na sua operação.</h2><p>Conte como você trabalha. A gente apresenta o GridStock e combina os próximos passos para o seu acesso.</p></div></Reveal>
        <div className={s.startGrid}>{[['01', 'Chame no WhatsApp', 'Conte sobre a sua empresa, seus almoxarifados e a rotina da equipe.'], ['02', 'Conheça o sistema', 'Converse sobre os recursos, as condições e a configuração para a sua operação.'], ['03', 'Receba seu acesso', 'Com o ambiente liberado, entre com CPF e senha e organize os cadastros da empresa.']].map(([number, title, text]) => <Reveal key={number}><div className={s.startStep}><span>{number}</span><h3>{title}</h3><p>{text}</p></div></Reveal>)}</div>
        <ContactLink>Solicitar acesso pelo WhatsApp</ContactLink>
      </section>

      <section className={`${s.section} ${s.faqSection}`} id="duvidas">
        <Reveal><div className={s.faqIntro}><span className={s.eyebrow}>VAMOS ESCLARECER</span><h2>Ficou alguma<br />peça faltando?</h2><p>Aqui estão as respostas para começar com clareza.</p><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={s.textLink}>Fale com a nossa equipe <Icon name="arrow" /></a></div></Reveal>
        <div className={s.faqList}>{faqs.map(([question, answer], i) => <details key={question} className={s.faqItem} name="gridstock-faq"><summary><span className={s.faqNumber}>0{i + 1}</span><span>{question}</span><span className={s.faqPlus} aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className={s.finalSection}><Reveal><div className={s.finalCard}><div className={s.finalGrid} aria-hidden="true" /><div className={s.finalCopy}><span className={s.eyebrow}>CADA PEÇA NO SEU RADAR.</span><h2>Seu estoque se movimenta.<br />Seu controle acompanha.</h2><p>Conecte a base e a equipe em campo com o GridStock.</p><ContactLink light>Solicitar acesso pelo WhatsApp</ContactLink><span className={s.finalMicrocopy}>Uma conversa para entender a sua operação.</span></div><div className={s.finalParcel}><span className={s.parcelSpeech}>Tudo no seu lugar. <Icon name="check" /></span><Parcel /></div></div></Reveal></section>
    </main>
    <footer className={s.footer}><div className={s.footerTop}><div><Link href="/" aria-label="GridStock, início"><Brand /></Link><p>Estoque em movimento.<br />Controle em cada etapa.</p></div><nav aria-label="Navegação do rodapé"><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><a href="#duvidas">Dúvidas</a><Link href="/login" prefetch={false}>Entrar no sistema <Icon name="arrow" /></Link></nav></div><div className={s.footerBottom}><span>© {new Date().getFullYear()} GridStock.</span><LegalFooterLinks /></div></footer>
  </div>;
}
