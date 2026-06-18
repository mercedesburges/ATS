import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/app/admin/clients/$candidateIdPlaceholder',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/admin/clients/$candidateIdPlaceholder"!</div>
}
