import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  candidateName?: string
  jobTitle?: string
  clientName?: string
  loginUrl?: string
}

const Email = ({
  candidateName = 'Hola',
  jobTitle = 'una nueva oportunidad',
  clientName = '',
  loginUrl = 'https://www.vivid-talent.com',
}: Props) => {
  const firstName = candidateName?.split(' ')[0] || 'Hola'
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>
        {`Tu entrevista para ${jobTitle}${clientName ? ` en ${clientName}` : ''}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>Vivid Talent</Heading>
          </Section>

          <Section style={card}>
            <Heading as="h2" style={h2}>
              Hola {firstName},
            </Heading>
            <Text style={paragraph}>
              Fuiste invitado/a a continuar con el proceso para{' '}
              <strong>{jobTitle}</strong>
              {clientName ? (
                <>
                  {' '}en <strong>{clientName}</strong>
                </>
              ) : null}
              .
            </Text>
            <Text style={paragraph}>
              El siguiente paso es una entrevista por video con nuestra IA.
              Para empezar, ingresá con tu cuenta de LinkedIn — vamos a usarla
              solo para verificar tu identidad y completar tu perfil.
            </Text>

            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button href={loginUrl} style={button}>
                Ingresar con LinkedIn
              </Button>
            </Section>

            <Text style={smallMuted}>
              Si el botón no funciona, copiá y pegá este enlace en tu navegador:
              <br />
              <Link href={loginUrl} style={linkStyle}>
                {loginUrl}
              </Link>
            </Text>

            <Hr style={hr} />
            <Text style={smallMuted}>
              Este enlace es personal y único para vos. No lo compartas con
              nadie. Si no esperabas este mensaje, podés ignorarlo.
            </Text>
          </Section>

          <Text style={footer}>
            Vivid Talent · Reclutamiento con IA
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Tu entrevista para ${data.jobTitle ?? 'una nueva oportunidad'}${
      data.clientName ? ` en ${data.clientName}` : ''
    }`,
  displayName: 'Invitación a candidato',
  previewData: {
    candidateName: 'Juan Pérez',
    jobTitle: 'Desarrollador Frontend',
    clientName: 'Acme Inc.',
    loginUrl: 'https://www.vivid-talent.com/candidate/login?c=demo&t=demo',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  color: '#1a1a1a',
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 20px' }
const header = { padding: '8px 0 24px' }
const brand = {
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: '#E07A3C',
  margin: 0,
}
const card = {
  backgroundColor: '#FBF8F4',
  borderRadius: '14px',
  padding: '32px 28px',
  border: '1px solid #F0E6DA',
}
const h2 = { fontSize: '22px', fontWeight: 600, margin: '0 0 16px', color: '#1a1a1a' }
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#3a3a3a', margin: '0 0 14px' }
const button = {
  backgroundColor: '#E07A3C',
  color: '#ffffff',
  padding: '13px 26px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}
const smallMuted = { fontSize: '13px', lineHeight: '1.5', color: '#7a7a7a', margin: '0 0 8px', wordBreak: 'break-all' as const }
const linkStyle = { color: '#E07A3C', textDecoration: 'underline' }
const hr = { borderColor: '#EEE6DA', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#9a9a9a', textAlign: 'center' as const, marginTop: '20px' }
