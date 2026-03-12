import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, UserPlus, Pencil, Trash2, Loader2 } from "lucide-react";
import { ContactFormPortal } from "./helpers";
import type { EnterpriseContact } from "@shared/schema";
import { ENTERPRISE_CONTACT_ROLES } from "@shared/schema";

interface ContactsTabProps {
  contacts: EnterpriseContact[] | undefined;
  contactsLoading: boolean;
  contactDialogOpen: boolean;
  onContactDialogChange: (open: boolean) => void;
  editContact: EnterpriseContact | undefined;
  onEditContact: (contact: EnterpriseContact | undefined) => void;
  onCreateContact: (data: Record<string, unknown>) => void;
  onUpdateContact: (params: { id: string; data: Record<string, unknown> }) => void;
  onDeleteContact: (id: string) => void;
  createPending: boolean;
  updatePending: boolean;
}

export default function EnterpriseContactsTab({
  contacts,
  contactsLoading,
  contactDialogOpen,
  onContactDialogChange,
  editContact,
  onEditContact,
  onCreateContact,
  onUpdateContact,
  onDeleteContact,
  createPending,
  updatePending,
}: ContactsTabProps) {
  const roleLabels: Record<string, string> = {};
  ENTERPRISE_CONTACT_ROLES.forEach((r) => { roleLabels[r.value] = r.label; });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Contacts de l'entreprise</CardTitle>
          <Button size="sm" onClick={() => { onEditContact(undefined); onContactDialogChange(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />Ajouter un contact
          </Button>
        </CardHeader>
        <CardContent>
          {contactsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !contacts || contacts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun contact enregistre</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telephone</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.firstName} {c.lastName}
                      {c.isPrimary && <Badge variant="outline" className="ml-2 text-xs">Principal</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.email || "\u2014"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.phone || "\u2014"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.department || "\u2014"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{roleLabels[c.role] || c.role}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { onEditContact(c); onContactDialogChange(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDeleteContact(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={contactDialogOpen} onOpenChange={(open) => { onContactDialogChange(open); if (!open) onEditContact(undefined); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editContact ? "Modifier le contact" : "Nouveau contact"}</DialogTitle>
          </DialogHeader>
          <ContactFormPortal
            contact={editContact}
            onSubmit={(data) =>
              editContact
                ? onUpdateContact({ id: editContact.id, data })
                : onCreateContact(data)
            }
            isPending={createPending || updatePending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
