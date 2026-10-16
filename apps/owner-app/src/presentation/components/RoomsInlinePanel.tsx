import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import { available, costs, Plan, Room } from "../../domain/models";
import { useAction, useLoad } from "../hooks";
import {
  InventoryEditor,
  PlanEditor,
  RoomEditor,
} from "../screens/RoomScreens";
import {
  Badge,
  Button,
  C,
  Card,
  Empty,
  Feedback,
  Link,
  Load,
  money,
  Row,
  T,
  Title,
} from "./UI";

export function RoomsInlinePanel({
  propertyId,
  rooms,
}: {
  propertyId: string;
  rooms: Room[];
}) {
  const repository = useRepositories().rooms;
  const action = useAction();
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<{
    id: string;
    mode: "details" | "inventory" | "plans";
  } | null>(null);
  const open = (room: Room, mode: "details" | "inventory" | "plans") => {
    setAdding(false);
    setSelected(
      selected?.id === room.id && selected.mode === mode
        ? null
        : { id: room.id, mode },
    );
  };
  return (
    <View style={{ gap: 16 }}>
      <Row>
        <Title>Tipe kamar</Title>
        <Badge>{rooms.length} tipe</Badge>
      </Row>
      <Button
        title="+ Tambah tipe kamar"
        onPress={() => {
          setSelected(null);
          setAdding(true);
        }}
      />
      {adding && (
        <View style={{ gap: 15 }}>
          <T style={{ fontWeight: "700" }}>Tipe kamar baru</T>
          <RoomEditor
            propertyId={propertyId}
            onSaved={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </View>
      )}
      {rooms.map((room) => (
        <Card key={room.id}>
          <Row>
            <T style={{ fontSize: 17, fontWeight: "800", flex: 1 }}>
              {room.name}
            </T>
            <Badge tone={room.is_active ? "green" : "navy"}>
              {room.is_active
                ? `${available(room.inventory)} tersedia`
                : "Nonaktif"}
            </Badge>
          </Row>
          <T muted style={{ fontSize: 12 }}>
            {room.floor_label} · {room.room_size_m2} m² · KM{" "}
            {room.bathroom_type === "PRIVATE" ? "dalam" : "bersama"}
          </T>
          <T style={{ fontSize: 12 }}>
            {room.facilities.join(" · ") || "Fasilitas belum diisi"}
          </T>
          <View>
            <Link
              title={`Edit tipe ${room.name}`}
              icon="user"
              onPress={() => open(room, "details")}
            />
            <Link
              title={`Ketersediaan ${room.name}`}
              icon="key"
              onPress={() => open(room, "inventory")}
            />
            <Link
              title={`Paket sewa ${room.name}`}
              icon="wallet"
              last
              onPress={() => open(room, "plans")}
            />
          </View>
          {selected?.id === room.id && (
            <View
              style={{
                gap: 15,
                borderTopWidth: 1,
                borderColor: C.line,
                paddingTop: 15,
              }}
            >
              {selected.mode === "details" && (
                <RoomEditor
                  key={room.id}
                  propertyId={propertyId}
                  value={room}
                  onSaved={() => setSelected(null)}
                  onCancel={() => setSelected(null)}
                />
              )}
              {selected.mode === "inventory" && (
                <View
                  pointerEvents={action.busy ? "none" : "auto"}
                  style={{ gap: 15 }}
                >
                  <InventoryEditor
                    key={`${room.id}-${room.inventory.version}`}
                    room={room}
                    save={(inventory, reason) =>
                      void action.run(
                        () =>
                          repository.updateInventory(
                            room.id,
                            inventory,
                            reason,
                          ),
                        () => setSelected(null),
                        "Ketersediaan tersimpan.",
                      )
                    }
                  />
                  <Feedback text={action.error} error />
                  <Button
                    title="Tutup ketersediaan"
                    secondary
                    disabled={action.busy}
                    onPress={() => setSelected(null)}
                  />
                </View>
              )}
              {selected.mode === "plans" && <InlinePlans room={room} />}
            </View>
          )}
        </Card>
      ))}
      {!rooms.length && !adding && (
        <Empty
          title="Belum ada tipe kamar"
          body="Tambahkan tipe kamar untuk mengatur kapasitas dan harga sewa."
        />
      )}
    </View>
  );
}

function InlinePlans({ room }: { room: Room }) {
  const { pricing } = useRepositories();
  const q = useLoad(
    useCallback(() => pricing.list(room.id), [pricing, room.id]),
    0,
    true,
  );
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  return (
    <View style={{ gap: 15 }}>
      <Title>Paket sewa</Title>
      <Button title="+ Tambah paket sewa" onPress={() => setEditing("new")} />
      <Load {...q} loading={q.loading && !q.data} />
      {editing && (
        <PlanEditor
          key={editing === "new" ? "new" : editing.id}
          roomId={room.id}
          value={editing === "new" ? undefined : editing}
          onSaved={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      )}
      {q.data?.map((plan) => (
        <Card key={plan.id} style={{ backgroundColor: C.soft }}>
          <Row>
            <T style={{ fontWeight: "700", flex: 1 }}>{plan.name}</T>
            <Badge tone={plan.is_active ? "green" : "navy"}>
              {plan.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
          </Row>
          <T style={{ color: C.orangeDark, fontSize: 18, fontWeight: "800" }}>
            {money(plan.price)}
          </T>
          <T muted style={{ fontSize: 12 }}>
            {plan.duration_value}{" "}
            {
              { DAY: "hari", WEEK: "minggu", MONTH: "bulan", YEAR: "tahun" }[
                plan.duration_unit
              ]
            }
          </T>
          <T style={{ fontSize: 11 }}>
            DP {money(costs(plan).dp)} · Deposit {money(costs(plan).deposit)}
          </T>
          <Link
            title={`Edit paket ${plan.name}`}
            last
            onPress={() => setEditing(plan)}
          />
        </Card>
      ))}
      {q.data?.length === 0 && !editing && <T muted>Belum ada paket sewa.</T>}
    </View>
  );
}
