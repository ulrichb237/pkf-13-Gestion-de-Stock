export function createDomainStub(nomDomaine: string) {
  return function DomainStub() {
    return <div className="text-sm text-muted-foreground">Page « {nomDomaine} » — a implementer</div>;
  };
}
